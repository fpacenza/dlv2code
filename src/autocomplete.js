const vscode = require('vscode');
const fs = require('fs');

function getASPCompletionItemProvider(context) {
    return {
        autocompleteDict: readAutocompleteDict(context),
		provideCompletionItems:function(document, position, token, context) {
            if(context.triggerKind === vscode.CompletionTriggerKind.TriggerCharacter) {
                completionItems = [];
                this.autocompleteDict[context.triggerCharacter].forEach(elem => {
                    completionItems.push(new vscode.CompletionItem(elem.label, vscode.CompletionItemKind.Method));
                    completionItems[completionItems.length - 1].insertText = new vscode.SnippetString(elem.snippet);
                    completionItems[completionItems.length - 1].detail = elem.detail;
                    completionItems[completionItems.length - 1].documentation = new vscode.MarkdownString(elem.documentation);
                });
                return completionItems;
            }
		}
	}
}

function readAutocompleteDict(context) {
	try {
        return JSON.parse(fs.readFileSync(context.asAbsolutePath('autocomplete.json'), 'utf-8'));
    } catch (error) {
        vscode.window.showErrorMessage("An error occurred while reading the file autocomplete.json: " + error);
        return;
    }	
}

module.exports = {
    getASPCompletionItemProvider
}