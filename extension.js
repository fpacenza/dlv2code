	const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	function runDLV2(options) {

		if(!vscode.window.activeTextEditor) {
			vscode.window.showErrorMessage('Cannot execute command: No open file');
			return;
		}
	
		let pathToFile = vscode.window.activeTextEditor.document.fileName;
	
		let pathToDLV2;
	
		switch(process.platform) {
			case "win32":
				pathToDLV2 = context.asAbsolutePath('bin/dlv2_windows.exe').replace(/ /g, "` ");
				break;
	
			case "darwin":
				pathToDLV2 = context.asAbsolutePath('bin/dlv2_mac').replace(/ /g, "\\ ");
				break;
			
			default:
				pathToDLV2 = context.asAbsolutePath('bin/dlv2_linux').replace(/ /g, "\\ ");
				break;
		}
	
		let terminal = vscode.window.activeTerminal;
	
		if(!terminal) terminal = vscode.window.createTerminal();
		terminal.show();
	
		let optionString = options ? options.join(' ') : '';
	
		terminal.sendText(pathToDLV2 + ' "' + pathToFile + '" ' + optionString);
	}

	let allAnswerSetsCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeAllAnswerSets', function () {
		let options = ['-n 0'];
		runDLV2(options);
	});

	let singleAnswerSetCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeSingleAnswerSet', function () {
		runDLV2();
	})

	let groundProgramCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeGroundProgram', function () {
		let options = ['--mode=idlv','--t'];
		runDLV2(options);
	})

	context.subscriptions.push(allAnswerSetsCommand);
	context.subscriptions.push(singleAnswerSetCommand);
	context.subscriptions.push(groundProgramCommand);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
