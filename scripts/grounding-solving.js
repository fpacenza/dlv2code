const util = require('./util.js');
const vscode = require('vscode');
const linkings = require('./linkings.js');

//Calls the DLV2 executable on the currently active file and on the files linked to it with the specified options
function runDLV2(context, options) {

	if(!util.checkCurrentFile()) return;

	let pathToFile = vscode.window.activeTextEditor.document.fileName;

	//Checks if there are files linked to the currently active file 
	let linkingsDict = linkings.purgeLinkings(context, pathToFile);
	if(!linkingsDict) return;
	let reverseLinkings = linkingsDict['reverseLinkings'];
	let linkedFiles = [pathToFile];
	if(pathToFile in linkingsDict) {
		linkedFiles = reverseLinkings[linkingsDict[pathToFile]];
	}
	linkedFiles.forEach((file, index) =>{
		linkedFiles[index] = '"' + file + '"';
	})

	//Gets the path to the DLV2 executable based on the os
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

	//Runs the DLV2 executable in the terminal
	let terminal = vscode.window.activeTerminal;
	if(!terminal) terminal = vscode.window.createTerminal();
	terminal.show();
	let optionString = options ? options.join(' ') : '';
	terminal.sendText(pathToDLV2 + " " + linkedFiles.join(' ') + " " + optionString);
}

function computeSingleAnswerSet(context) {
	runDLV2(context);
}

function computeAllAnswerSets(context) {
	let options = ['-n 0'];
	runDLV2(context, options);
}

function computeGroundProgram(context) {
	let options = ['--mode=idlv','--t'];
	runDLV2(context, options);
}

module.exports = {
    runDLV2,
    computeSingleAnswerSet,
    computeAllAnswerSets,
    computeGroundProgram
}