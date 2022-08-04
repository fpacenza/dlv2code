const vscode = require('vscode');
const fs = require('fs');

/**
 * @param {vscode.ExtensionContext} context
 */

 function activate(context) {

	purgeLinkings(context);

	let singleAnswerSetCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeSingleAnswerSet', function () {
		computeSingleAnswerSet(context);
	});

	let allAnswerSetsCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeAllAnswerSets', function () {
		computeAllAnswerSets(context);
	});

	let groundProgramCommand = vscode.commands.registerCommand('asp-language-support-dlv2.computeGroundProgram', function () {
		computeGroundProgram(context);
	})

	let linkFilesCommand = vscode.commands.registerCommand("asp-language-support-dlv2.linkFiles", function () {
		linkFiles(context);
	});

	let unlinkFilesCommand = vscode.commands.registerCommand("asp-language-support-dlv2.unlinkFiles", function () {
		unlinkFiles(context);
	});

	let disbandPoolCommand = vscode.commands.registerCommand("asp-language-support-dlv2.disbandPool", function () {
		disbandPool(context);
	});

	let viewAllPoolsCommand = vscode.commands.registerCommand("asp-language-support-dlv2.viewAllPools", function () {
		viewAllPools(context);
	});

	let viewCurrentFilePoolCommand = vscode.commands.registerCommand("asp-language-support-dlv2.viewCurrentFilePool", function () {
		viewCurrentFilePool(context);
	});

	context.subscriptions.push(allAnswerSetsCommand);
	context.subscriptions.push(singleAnswerSetCommand);
	context.subscriptions.push(groundProgramCommand);
	context.subscriptions.push(linkFilesCommand);
	context.subscriptions.push(unlinkFilesCommand);
	context.subscriptions.push(disbandPoolCommand);
	context.subscriptions.push(viewAllPoolsCommand);
	context.subscriptions.push(viewCurrentFilePoolCommand);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}

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

//Calls the DLV2 executable on the currently active file and on the files linked to it with the specified options
function runDLV2(context, options) {

	if(!checkCurrentFile()) return;

	let pathToFile = vscode.window.activeTextEditor.document.fileName;

	//Checks if there are files linked to the currently active file 
	let linkings = purgeLinkings(context, pathToFile);
	if(!linkings) return;
	let reverseLinkings = linkings['reverseLinkings'];
	let linkedFiles = [pathToFile];
	if(pathToFile in linkings) {
		linkedFiles = reverseLinkings[linkings[pathToFile]];
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

//Reads the file linkings.json and returns a dictionary or undefined if it failed to read the file
//linkings.json has entries in the form "path_to_file" : "pool_n" where n is a number identifying the pool of linked files
//linkings.json has an entry "poolId" keeping track of the last used number for the pools
//linkings.json has an entry "reverseLinkings" containing a dictionary with entries in the form "pool_n" : ["file1", ...]	
function readLinkings(context) {
	let linkingsJSON;
	let linkings;
	try {
		linkingsJSON = fs.readFileSync(context.asAbsolutePath('linkings.json'), 'utf-8');
		linkings = JSON.parse(linkingsJSON);
	} catch (error) {
		vscode.window.showErrorMessage("An error occurred while reading the file linkings.json: " + error);
		return;
	}

	return linkings;
}

//Writes the linkings dictionary in the file linkings.json
function writeLinkings(context, linkings) {
	try {
		//First writes to temp file and then renames it to avoid corruption due to crashes
		fs.writeFileSync(context.asAbsolutePath('temp_linkings.json'), JSON.stringify(linkings), 'utf-8');
		fs.renameSync(context.asAbsolutePath("temp_linkings.json"), context.asAbsolutePath("linkings.json"));
	} catch (error) {
		vscode.window.showErrorMessage("An error occurred while trying to modify the file linkings.json: " + error);
	}
}

//Remove any non-existent file from the file linkings.json and returns the purged dictionary or undefined if it failed reading
//If a filepath is passed as an argument, only applies the function to the pool containing the filepath, otherwise on all pools
function purgeLinkings(context, filepath) {
	let linkings = readLinkings(context);
	if(!linkings) return;

	let reverseLinkings = linkings['reverseLinkings'];

	//Remove any non-existent file from a single pool
	function purgePool(pool) {
		let files = reverseLinkings[pool];
		let missingFiles = [];

		files = files.filter(file => {
			//If the file doesn't exist anymore it is removed from the pool it was in
			if(!fs.existsSync(file)) {
				delete linkings[file];
				missingFiles.push(file);
				return false;
			}
			return true;
		});

		if(missingFiles.length != 0) {
			vscode.window.showErrorMessage("The following files were linked to other files but are missing:", {"modal": true, "detail": missingFiles.join('\n')});
		}

		//If there is only one or less file in the pool, remove the pool
		if(files.length <= 1) {
			if(files.length === 1){
				delete linkings[files[0]];
			}
			delete reverseLinkings[pool];
		}
		else {
			reverseLinkings[pool] = files;
		}
	}

	if(filepath) {
		if(filepath in linkings) {
			purgePool(linkings[filepath]);
		}
	}
	else {
		for(const [pool, files] of Object.entries(reverseLinkings)) {
			purgePool(pool);
		}
	}

	linkings['reverseLinkings'] = reverseLinkings;
	writeLinkings(context, linkings);

	return linkings;
}

async function linkFiles(context) {
	if(!checkCurrentFile()) return;

	let pathToCurrentFile = vscode.window.activeTextEditor.document.fileName;

	//Prompts the user for files to link the currently active file to
	let result = await vscode.window.showOpenDialog(
		{
			"title": "Choose files to link",
			"openLabel" : "Link",
			"filters" : {
				"ASP" : ['lp', 'asp', 'dlv']
			},
			"canSelectMany" : true
		});
	if(!result || result.length === 0 || (result.length === 1 && result[0].fsPath === pathToCurrentFile)) return;
	
	let linkings = readLinkings(context);
	if(!linkings) return;
	
	let reverseLinkings = linkings['reverseLinkings'];	

	//Scans through the chosen files and the currently active file and see if they belong to a pool already
	//The one that belongs to the biggest pool determines the base pool all other linked files will go in
	let maxPoolLength = 0;
	let biggestPool;
	let poolsToMerge = {}

	result.forEach(file => {

		if(file.fsPath in linkings) {
			let filePool = linkings[file.fsPath];
			poolsToMerge[filePool] = true;

			if(reverseLinkings[filePool].length > maxPoolLength) {
				maxPoolLength = reverseLinkings[filePool].length;
				biggestPool = filePool;
			}
		}
	});

	if(pathToCurrentFile in linkings) {
		let filePool = linkings[pathToCurrentFile];
		poolsToMerge[filePool] = true;
		if(reverseLinkings[filePool].length > maxPoolLength) {
			maxPoolLength = reverseLinkings[filePool].length;
			biggestPool = filePool;
		}
	}

	//If no file belongs to a pool, create a new pool
	if(maxPoolLength === 0) {
		linkings['poolId']++;
		let newPoolId = linkings['poolId'];
		reverseLinkings['pool_' + newPoolId] = [];

		result.forEach(file => {
			if(file.fsPath != pathToCurrentFile) {
				linkings[file.fsPath] = 'pool_' + newPoolId;
				reverseLinkings['pool_' + newPoolId].push(file.fsPath);
			}
		});
		linkings[pathToCurrentFile] = 'pool_' + newPoolId;
		reverseLinkings['pool_' + newPoolId].push(pathToCurrentFile);
	}
	else {
		//Moves every linked file from its pool to the biggest pool
		for (const [pool, value] of Object.entries(poolsToMerge)) {
			if(pool != biggestPool) {
				let filesToMerge = reverseLinkings[pool];

				filesToMerge.forEach(file => {
					if(file != pathToCurrentFile) {
						linkings[file] = biggestPool;
						reverseLinkings[biggestPool].push(file);
					}
				});
				//Deletes the pool after moving every file in it
				delete reverseLinkings[pool];
			}
		}

		//Necessary condition that prevents a file to be put in the same pool multiple times
		if(linkings[pathToCurrentFile] !== biggestPool) {
			linkings[pathToCurrentFile] = biggestPool;
			reverseLinkings[biggestPool].push(pathToCurrentFile);
		}
	}

	writeLinkings(context, linkings);
	vscode.window.showInformationMessage("The currently active file has been successfully linked to the selected files");	
}

//Unlinks the currently active file from all other files
async function unlinkFiles(context) {
	if(!checkCurrentFile()) return;

	let linkings = readLinkings(context);
	if(!linkings) return;

	let pathToCurrentFile = vscode.window.activeTextEditor.document.fileName;

	if(!(pathToCurrentFile in linkings)) {
		vscode.window.showErrorMessage("The currently active file is not linked to any other file");
		return;
	}

	let reverseLinkings = linkings['reverseLinkings'];
	let linkedFiles = reverseLinkings[linkings[pathToCurrentFile]];

	//If the currently active file is linked to a single other file, removes the pool
	if(linkedFiles.length === 2) {
		delete reverseLinkings[linkings[pathToCurrentFile]]
		delete linkings[linkedFiles[0]];
		delete linkings[linkedFiles[1]];
	}
	//Otherwise just removes the currently active file from the pool
	else {
		reverseLinkings[linkings[pathToCurrentFile]].splice(linkedFiles.indexOf(pathToCurrentFile), 1);
		delete linkings[pathToCurrentFile];
	}
	linkings['reverseLinkings'] = reverseLinkings;

	writeLinkings(context, linkings);
	vscode.window.showInformationMessage("The currently active file has been successfully unlinked from any other files");
}

async function disbandPool(context) {
	if(!checkCurrentFile()) return;

	let answer = await vscode.window.showWarningMessage("Are you sure you want to continue?", {"modal": true, "detail":"This operation will unlink this file and all files linked to it from each other."}, "Yes", "No")

	if(answer === "No") return;

	let linkings = readLinkings(context);
	if(!linkings) return;

	let pathToCurrentFile = vscode.window.activeTextEditor.document.fileName;

	if(!(pathToCurrentFile in linkings)) {
		vscode.window.showErrorMessage("The currently active file is not linked to any other file");
		return;
	}

	let reverseLinkings = linkings['reverseLinkings'];
	let pool = linkings[pathToCurrentFile];
	let linkedFiles = reverseLinkings[pool];

	linkedFiles.forEach(file => {
		delete linkings[file];
	})

	delete reverseLinkings[pool];
	linkings['reverseLinkings'] = reverseLinkings;

	writeLinkings(context, linkings);

	vscode.window.showInformationMessage("The files have been successfully unlinked");
}

function viewAllPools(context) {
	let linkings = readLinkings(context);
	if(!linkings) return;

	let outputChannel = vscode.window.createOutputChannel("Linked files");
	outputChannel.show();

	let reverseLinkings = linkings['reverseLinkings'];

	if(Object.keys(reverseLinkings).length === 0) {
		outputChannel.appendLine("There are no linked files at the moment");
		return;
	}

	outputChannel.appendLine("Pools of linked files:");
	for(const files of Object.values(reverseLinkings)) {
		outputChannel.appendLine("Pool:");
		files.forEach(file => {
			outputChannel.appendLine(file);
		})
		outputChannel.appendLine("");
	}
}

function viewCurrentFilePool(context) {
	if(!checkCurrentFile()) return;

	let linkings = readLinkings(context);
	if(!linkings) return;

	let outputChannel = vscode.window.createOutputChannel("Linked files");
	outputChannel.show();

	let pathToCurrentFile = vscode.window.activeTextEditor.document.fileName;

	if(!(pathToCurrentFile in linkings)) {
		outputChannel.appendLine("The currently active file is not linked to any other file");
		return;
	}

	let reverseLinkings = linkings['reverseLinkings'];
	outputChannel.appendLine("Current active file's pool:");
	reverseLinkings[linkings[pathToCurrentFile]].forEach(file => {
		outputChannel.appendLine(file);
	});
}