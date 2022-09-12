const util = require('./util.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

//Returns a provider that manages intellisense for directives, aggregates, default and custom external atoms
function getASPIntellisenseProvider(context) {
    return {
        autocompleteDict: readAutocompleteDict(context),
        customExternalAtoms: readCustomExternalAtoms(context),
        //Called when the external atoms file is modified to get the updated version
        refreshCustomExternalAtoms: function(context) {
            this.customExternalAtoms = readCustomExternalAtoms(context);
        },

        //Provides autocomplete
		provideCompletionItems: function(document, position, token, context) {
            let completionItems = [];

            //Checks if the text being inserted is after a trigger character (# or &)
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

            //If the trigger character is found it provides every completion item associated with that character
            if(triggerCharacter) {
                function registerAutcompleteEntry(elem) {
                    completionItems.push(new vscode.CompletionItem(elem.label, vscode.CompletionItemKind.Method));
                    completionItems[completionItems.length - 1].insertText = new vscode.SnippetString(elem.snippet);
                    completionItems[completionItems.length - 1].detail = elem.detail;
                    completionItems[completionItems.length - 1].documentation = new vscode.MarkdownString(elem.documentation);
                }

                for(const elem of Object.values(this.autocompleteDict[triggerCharacter])) {
                    registerAutcompleteEntry(elem);
                }

                if(triggerCharacter === '&') {
                    for(const elem of Object.values(this.customExternalAtoms)) {
                        registerAutcompleteEntry(elem);
                    }
                }
            }
            else {
                this.autocompleteDict["language-constants"].forEach(elem => {
                    completionItems.push(new vscode.CompletionItem(elem, vscode.CompletionItemKind.Constant));
                });
            }

            return completionItems;
		},

        //Provides details on hover
        provideHover: function(document, position, token) {

            //Checks if the text the cursor is on is after a trigger character (# or &)
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

            //If the trigger character is found it finds the entire word after the character and provides hover details for that word if there exists a completion item for that word
            if(triggerCharacter) {
                let start = character;
                let end = position.character;
    
                while(end < line.text.length && validCharacters.test(line.text[end])) {
                    ++end;
                }
                let hoverWord = line.text.substring(start, end);

                if(hoverWord in this.autocompleteDict[triggerCharacter]) {
                    let hoverElement = this.autocompleteDict[triggerCharacter][hoverWord];
                    return new vscode.Hover([hoverElement.detail, hoverElement.documentation]);
                }
                
                if(triggerCharacter === '&' && hoverWord in this.customExternalAtoms) {
                    let hoverElement = this.customExternalAtoms[hoverWord];
                    return new vscode.Hover([hoverElement.detail, hoverElement.documentation]);
                }
            }
        }
	}
}

//Reads the file autocomplete.json and returns a dictionary
function readAutocompleteDict(context) {
    let autocompleteDict = {};
	try {
        autocompleteDict = JSON.parse(fs.readFileSync(context.asAbsolutePath('autocomplete.json'), 'utf-8'));
    } catch (error) {
        vscode.window.showErrorMessage("An error occurred while reading the file autocomplete.json: " + error);
        return autocompleteDict;
    }	
    return autocompleteDict;
}

//Reads and parses the file external-atoms.py (if it exists in the current workspace) and returns a dictionary
function readCustomExternalAtoms(context) {
    let customExternalAtoms = {};

    if(!util.checkWorkspace()) return customExternalAtoms;

    let externalAtomsFile = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "external-atoms.py");

    if(!fs.existsSync(externalAtomsFile)) {
        return customExternalAtoms;
    }

    let externalAtoms;

    try {
        externalAtoms = fs.readFileSync(externalAtomsFile, 'utf-8');
    } catch (error) {
        vscode.window.showErrorMessage("An error occurred while reading the file external-atoms.py: " + error);
        return customExternalAtoms;
    }

    //The following regex captures function definitions and eventual commented lines preceding them (they are considered documentation)
    let matches = externalAtoms.matchAll(/((?:#.*\n)*)def\s+(\w+)\s*\((.*?)\)/g);
    
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

        customExternalAtoms['&' + match[2]] = {
            "label": match[2], 
            "snippet": snippet, 
            "detail": detail, 
            "documentation": documentation
        };
    }

    return customExternalAtoms;
}

module.exports = {
    getASPIntellisenseProvider
}