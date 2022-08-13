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

	let singleAnswerSetCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeSingleAnswerSet', function () {
		grouding_solving.computeSingleAnswerSet(context);
	});

	let allAnswerSetsCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeAllAnswerSets', function () {
		grouding_solving.computeAllAnswerSets(context);
	});

	let groundProgramCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeGroundProgram', function () {
		grouding_solving.computeGroundProgram(context);
	})

	let linkFilesCommand = vscode.commands.registerCommand("asp-language-support-dlv2.linkFiles", function () {
		linkings.linkFiles(context);
	});

	let unlinkFilesCommand = vscode.commands.registerCommand("asp-language-support-dlv2.unlinkFiles", function () {
		linkings.unlinkFiles(context);
	});

	let disbandPoolCommand = vscode.commands.registerCommand("asp-language-support-dlv2.disbandPool", function () {
		linkings.disbandPool(context);
	});

	let viewAllPoolsCommand = vscode.commands.registerCommand("asp-language-support-dlv2.viewAllPools", function () {
		linkings.viewAllPools(context);
	});

	let viewCurrentFilePoolCommand = vscode.commands.registerCommand("asp-language-support-dlv2.viewCurrentFilePool", function () {
		linkings.viewCurrentFilePool(context);
	});

	context.subscriptions.push(vscode.window.registerWebviewViewProvider("asp-language-support-dlv2.interface", advancedOptions.getWebviewViewProvider(context)));
	context.subscriptions.push(allAnswerSetsCommand);
	context.subscriptions.push(singleAnswerSetCommand);
	context.subscriptions.push(groundProgramCommand);
	context.subscriptions.push(linkFilesCommand);
	context.subscriptions.push(unlinkFilesCommand);
	context.subscriptions.push(disbandPoolCommand);
	context.subscriptions.push(viewAllPoolsCommand);
	context.subscriptions.push(viewCurrentFilePoolCommand);
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('asp', autocomplete.getASPCompletionItemProvider(context), '#', '&'));
}

function deactivate() {}	

module.exports = {
	activate,
	deactivate
}