const vscode = require('vscode');
const fs = require('fs');

//Checks if there is a file .asp .lp or .dlv open in the editor
function checkCurrentFile() {
	if(!vscode.window.activeTextEditor) {
		vscode.window.showErrorMessage('Cannot execute command: No open file');
		return false;
	}

	if(!(/.*\.(lp|asp|dlv)$/.test(vscode.window.activeTextEditor.document.fileName))) {
		vscode.window.showErrorMessage("The file with focus (" + vscode.window.activeTextEditor.document.fileName + ") is not a .asp, .lp or .dlv file");
		return false;
	}

	return true;
}

//Reads the file config.json and returns a dictionary or undefined if it failed to read the file
function readConfigFile(context) {
	let configJSON;
	let config;
	try {
		configJSON = fs.readFileSync(context.asAbsolutePath('config.json'), 'utf-8');
		config = JSON.parse(configJSON);
	} catch (error) {
		vscode.window.showErrorMessage("An error occurred while reading the file config.json: " + error);
		return;
	}
	return config;
}

module.exports = {
    checkCurrentFile,
	readConfigFile
}	