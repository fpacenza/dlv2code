const vscode = require('vscode');

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

module.exports = {
    checkCurrentFile
}