const linkings = require('./linkings.js');
const grouding_solving = require('./grounding-solving.js');
const autocomplete = require('./autocomplete.js');
const advancedOptions = require('./advancedOptions.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

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
	context.subscriptions.push(vscode.commands.registerCommand("asp-language-support-dlv2.manageConfigFile", function () {
		vscode.workspace.openTextDocument(context.asAbsolutePath("config.json")).then((document) => {
			vscode.window.showTextDocument(document);
		}, (error) => {
			vscode.window.showErrorMessage("An error occurred while opening file config.json: " + error);
		});
	}));
	context.subscriptions.push(vscode.commands.registerCommand("asp-language-support-dlv2.manageCustomExternalAtoms", function () {
		
		//If a file for custom external atoms does not already exist in the current workspace, it is created
		let externalAtomsFile = path.join(vscode.workspace.workspaceFolders[0].uri.path, "external-atoms.py");
		if(!fs.existsSync(externalAtomsFile)) {
			let template = fs.readFileSync(context.asAbsolutePath('external-atoms-template.py'), 'utf-8');
			fs.writeFileSync(externalAtomsFile, template, 'utf-8');
		}
	
		vscode.window.showTextDocument(vscode.Uri.file(externalAtomsFile));
	}));

	context.subscriptions.push(vscode.window.registerWebviewViewProvider("asp-language-support-dlv2.interface", advancedOptions.getWebviewViewProvider(context)));

	let aspIntellisenseProvider = autocomplete.getASPIntellisenseProvider(context);
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('asp', aspIntellisenseProvider, '#', '&'));
	context.subscriptions.push(vscode.languages.registerHoverProvider("asp", aspIntellisenseProvider));

	let externalAtomsFileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0].uri.path, "external-atoms.py"));
	externalAtomsFileWatcher.onDidChange(() => {
		aspIntellisenseProvider.refreshCustomExternalAtoms(context);
	});
	externalAtomsFileWatcher.onDidCreate(() => {
		aspIntellisenseProvider.refreshCustomExternalAtoms(context);
	});
	externalAtomsFileWatcher.onDidDelete(() => {
		aspIntellisenseProvider.refreshCustomExternalAtoms(context);
	})
	context.subscriptions.push(externalAtomsFileWatcher);
}

function deactivate() {}	

module.exports = {
	activate,
	deactivate
}