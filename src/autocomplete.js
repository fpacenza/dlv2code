const vscode = require('vscode');
const fs = require('fs');

//Returns a completion item provider that manages intellisense for directives, aggregates, default and custom external atoms
function getASPCompletionItemProvider(context) {
    return {
        autocompleteDict: readAutocompleteDict(context),
        customExternalAtoms: readCustomExternalAtoms(context),
        //Called when the external atoms file is modified to get the updated version
        refreshCustomExternalAtoms:function(context) {
            this.customExternalAtoms = readCustomExternalAtoms(context);
        },
		provideCompletionItems:function(document, position, token, context) {
            let completionItems = [];

            //Checks if the text being inserted is after a trigger character
            let triggerCharacter;
            let line = document.lineAt(position);
            let character = position.character - 1;
            let validCharacters = /[a-zA-Z0-9_#&]/

            while(character >= 0 && validCharacters.test(line.text[character])) {
                if(line.text[character] === '#' || line.text[character] === '&') {
                    triggerCharacter = line.text[character];
                    break;
                }
                --character;
            }

            if(triggerCharacter) {
                function registerAutcompleteEntry(elem) {
                    completionItems.push(new vscode.CompletionItem(elem.label, vscode.CompletionItemKind.Method));
                    completionItems[completionItems.length - 1].insertText = new vscode.SnippetString(elem.snippet);
                    completionItems[completionItems.length - 1].detail = elem.detail;
                    completionItems[completionItems.length - 1].documentation = new vscode.MarkdownString(elem.documentation);
                }

                this.autocompleteDict[triggerCharacter].forEach(elem => {
                    registerAutcompleteEntry(elem);
                });

                if(triggerCharacter === '&') {
                    this.customExternalAtoms.forEach(elem => {
                        registerAutcompleteEntry(elem);
                    })
                }
            }
            else {
                this.autocompleteDict["language-constants"].forEach(elem => {
                    completionItems.push(new vscode.CompletionItem(elem, vscode.CompletionItemKind.Constant));
                });
            }

            return completionItems;
		}
	}
}

//Reads the file autocomplete.json and returns a dictionary or undefined if it failed to read the file
function readAutocompleteDict(context) {
    let autocompleteDict;
	try {
        autocompleteDict = JSON.parse(fs.readFileSync(context.asAbsolutePath('autocomplete.json'), 'utf-8'));
    } catch (error) {
        vscode.window.showErrorMessage("An error occurred while reading the file autocomplete.json: " + error);
        return;
    }	
    return autocompleteDict;
}

//Reads and parses the file external-atoms.py and returns an array or undefined if it failed to read the file
function readCustomExternalAtoms(context) {
    let customExternalAtoms = [];
    let externalAtomsFile;
    try {
        externalAtomsFile = fs.readFileSync(context.asAbsolutePath('external-atoms.py'), 'utf-8');
    } catch (error) {
        vscode.window.showErrorMessage("An error occurred while reading the file external-atoms.py: " + error);
        return;
    }

    //The following regex captures function definitions and eventual commented lines preceding them (they are considered documentation)
    let matches = externalAtomsFile.matchAll(/((?:#.*\n)*)def\s+(\w+)\s*\((.*?)\)/g);
    
    //For each function definition, creates and object in the same form as the objects in the file autocomplete.json
    for(const match of matches) {
        let inputTerms = [];
        if(match[3]) {
            inputTerms = match[3].split(",").map(term => term.trim());
        }
        
        let count = 0;
        let snippet = match[2] + "(" + inputTerms.map(term => "${" + ++count +":" + term.trim() + "}").join(",") + ";${" + ++count +":Output})";

        let detail = "(custom external atom) &" + match[2] + "(" + inputTerms.join(",") + ";Output)";

        let documentation = match[1].split("\n").map(line => line.substring(1)).join("\n");

        customExternalAtoms.push({"label": match[2], "snippet": snippet, "detail": detail, "documentation": documentation});
    }

    return customExternalAtoms;
}

module.exports = {
    getASPCompletionItemProvider
}