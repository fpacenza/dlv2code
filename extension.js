	const vscode = require('vscode');
	const fs = require('fs');
const { throws } = require('assert');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	//Calls the DLV2 executable on the current working file and on the files linked to it with the specified options
	function runDLV2(options) {

		if(!vscode.window.activeTextEditor) {
			vscode.window.showErrorMessage('Cannot execute command: No open file');
			return;
		}
	
		let pathToFile = vscode.window.activeTextEditor.document.fileName;

		//Checks if there are files linked to the current working file 
		let linkings = purgeLinkings(pathToFile);
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

	//Reads the file linkings.json and returns a dictionary or undefined if it failed to read the file
	//linkings.json has entries in the form "path_to_file" : "pool_n" where n is a number identifying the pool of linked files
	//linkings.json has an entry "poolId" keeping track of the last used number for the pools
	//linkings.json has an entry "reverseLinkings" containing a dictionary with entries in the form "pool_n" : ["file1", ...]	
	function readLinkings() {
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
	function writeLinkings(linkings) {
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
	function purgeLinkings(filepath) {
		let linkings = readLinkings();
		if(!linkings) return;

		let reverseLinkings = linkings['reverseLinkings'];

		//Remove any non-existent file from a single pool
		function purgePool(pool) {
			let files = reverseLinkings[pool];

			files = files.filter(file => {
				//If the file doesn't exist anymore it is removed from the pool it was in
				if(!fs.existsSync(file)) {
					delete linkings[file];
					vscode.window.showErrorMessage("The file " + file + " was linked to other files but is missing");
					return false;
				}
				return true;
			});

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
		writeLinkings(linkings);

		return linkings;
	}

	purgeLinkings();

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

	let linkFilesCommand = vscode.commands.registerCommand("asp-language-support-dlv2.linkFiles", async function () {
		
		if(!vscode.window.activeTextEditor) {
			vscode.window.showErrorMessage('Cannot execute command: No open file');
			return;
		}

		let pathToCurrentFile = vscode.window.activeTextEditor.document.fileName;

		//Prompts the user for files to link the current working file to
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
		
		let linkings = readLinkings();
		if(!linkings) return;
		
		let reverseLinkings = linkings['reverseLinkings'];	

		//Scans through the chosen files and the current working file and see if they belong to a pool already
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
			linkings[pathToCurrentFile] = biggestPool;
			reverseLinkings[biggestPool].push(pathToCurrentFile);
		}

		writeLinkings(linkings);
	})

	context.subscriptions.push(allAnswerSetsCommand);
	context.subscriptions.push(singleAnswerSetCommand);
	context.subscriptions.push(groundProgramCommand);
	context.subscriptions.push(linkFilesCommand);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
