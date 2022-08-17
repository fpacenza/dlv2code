const linkings = require('./linkings.js');
const grouding_solving = require('./grounding-solving.js');
const autocomplete = require('./autocomplete.js');
const advancedOptions = require('./advancedOptions.js');
const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */

 function activate(context) {
	
	linkings.purgeLinkings(context);

	context.subscriptions.push(vscode.commands.registerCommand('asp-language-support-dlv2.computeSingleAnswerSet', function () {
		grouding_solving.computeSingleAnswerSet(context);
	}));
	context.subscriptions.push(vscode.commands.registerCommand('asp-language-support-dlv2.computeAllAnswerSets', function () {
		grouding_solving.computeAllAnswerSets(context);
	}));
	context.subscriptions.push(vscode.commands.registerCommand('asp-language-support-dlv2.computeGroundProgram', function () {
		grouding_solving.computeGroundProgram(context);
	}));
	context.subscriptions.push(vscode.commands.registerCommand("asp-language-support-dlv2.linkFiles", function () {
		linkings.linkFiles(context);
	}));
	context.subscriptions.push(vscode.commands.registerCommand("asp-language-support-dlv2.unlinkFiles", function () {
		linkings.unlinkFiles(context);
	}));
	context.subscriptions.push(vscode.commands.registerCommand("asp-language-support-dlv2.disbandPool", function () {
		linkings.disbandPool(context);
	}));
	context.subscriptions.push(vscode.commands.registerCommand("asp-language-support-dlv2.viewAllPools", function () {
		linkings.viewAllPools(context);
	}));
	context.subscriptions.push(vscode.commands.registerCommand("asp-language-support-dlv2.viewCurrentFilePool", function () {
		linkings.viewCurrentFilePool(context);
	}));
	context.subscriptions.push(vscode.commands.registerCommand("asp-language-support-dlv2.manageCustomExternalAtoms", function () {
		vscode.workspace.openTextDocument(context.asAbsolutePath("external-atoms.py")).then((document) => {
			vscode.window.showTextDocument(document);
		}, (error) => {
			vscode.window.showErrorMessage("An error occurred while opening file external-atoms.py: " + error);
		});
	}));


	context.subscriptions.push(vscode.window.registerWebviewViewProvider("asp-language-support-dlv2.interface", advancedOptions.getWebviewViewProvider(context)));

	let aspIntellisenseProvider = autocomplete.getASPIntellisenseProvider(context);
	let externalAtomsFileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(context.asAbsolutePath("."), "external-atoms.py"));
	externalAtomsFileWatcher.onDidChange(() => {
		aspIntellisenseProvider.refreshCustomExternalAtoms(context);
	});

	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('asp', aspIntellisenseProvider, '#', '&'));
	context.subscriptions.push(vscode.languages.registerHoverProvider("asp", aspIntellisenseProvider));
	context.subscriptions.push(externalAtomsFileWatcher);
}

function deactivate() {}	

module.exports = {
	activate,
	deactivate
}