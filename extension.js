const path = require('path');
const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let allAnswerSetsCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeAllAnswerSets', function () {
		let options = ['-n 0'];
		runDLV2(options);
	});

	let singleAnswerSetCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeSingleAnswerSet', function () {
		runDLV2();
	})

	//Currently not very human readable
	let groundProgramCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeGroundProgram', function () {
		let options = ['--mode=idlv','--t'];
		runDLV2(options);
	})

	context.subscriptions.push(allAnswerSetsCommand);
	context.subscriptions.push(singleAnswerSetCommand);
	context.subscriptions.push(groundProgramCommand);
}

function deactivate() {}

function runDLV2(options) {

	if(!vscode.window.activeTextEditor) {
		vscode.window.showErrorMessage('Cannot execute command: No open file');
		return;
	}

	let pathToFile = vscode.window.activeTextEditor.document.fileName;

	let terminal = vscode.window.activeTerminal;

	if(!terminal) terminal = vscode.window.createTerminal();
	terminal.show();

	let optionString = options ? options.join(' ') : '';

	terminal.sendText("'" + path.resolve('./bin/dlv2') + "' '" + pathToFile + "' " + optionString);
}

module.exports = {
	activate,
	deactivate
}
