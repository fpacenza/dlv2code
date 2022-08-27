const util = require('./util.js');
const linkings = require('./linkings.js');
const fs = require('fs');
const vscode = require('vscode');

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
	linkedFiles.push('"' + context.asAbsolutePath('external-atoms.py') + '"');

	let config = util.readConfigFile(context);
	let pathToDLV2 = config['pathToDLV2'];

	//Uses default executable only if custom executable is not specified or is missing
	if(pathToDLV2 && pathToDLV2 !== "") {
		if(!fs.existsSync(pathToDLV2)) {
			vscode.window.showWarningMessage("The dlv2 path specified in the file config.json does not exist. Using default DLV2 executable");
			pathToDLV2 = getPathToDLV2(context);
		}
	}
	else {
		pathToDLV2 = getPathToDLV2(context);
	}
	
	//Makes dlv2 file executable
	fs.chmodSync(pathToDLV2, "755");
	
	pathToDLV2 = util.escapeSpaces(pathToDLV2);

	//Runs the DLV2 executable in the terminal
	let terminal = vscode.window.activeTerminal;
	if(!terminal) terminal = vscode.window.createTerminal();
	let optionString = options ? options.join(' ') : '';
	terminal.sendText(" " + pathToDLV2 + " " + linkedFiles.join(' ') + " " + optionString);
	terminal.show();
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

//Gets the path to the DLV2 executable based on the os
function getPathToDLV2(context) {
	let pathToDLV2;
	switch(process.platform) {
		case "win32":
			pathToDLV2 = context.asAbsolutePath('bin/dlv2_windows.exe');
			break;

		case "darwin":
			pathToDLV2 = context.asAbsolutePath('bin/dlv2_mac');
			break;
		
		default:
			pathToDLV2 = context.asAbsolutePath('bin/dlv2_linux');
			break;
	}
	return pathToDLV2;
}

module.exports = {
    runDLV2,
    computeSingleAnswerSet,
    computeAllAnswerSets,
    computeGroundProgram
}