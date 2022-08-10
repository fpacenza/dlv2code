const linkings = require('./linkings.js');
const grouding_solving = require('./grounding-solving.js');
const autocomplete = require('./autocomplete.js');
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

	let thisProvider={
        resolveWebviewView:function(thisWebviewView, thisWebviewContext, thisToke){
            thisWebviewView.webview.options={enableScripts:true}
            thisWebviewView.webview.html = getContentForWebview(thisWebviewView.webview, context.extensionUri);
			thisWebviewView.webview.onDidReceiveMessage(message => {
				grouding_solving.runDLV2(context, message);
			});
        }
    };

	context.subscriptions.push(vscode.window.registerWebviewViewProvider("asp-language-support-dlv2.interface", thisProvider));

	context.subscriptions.push(allAnswerSetsCommand);
	context.subscriptions.push(singleAnswerSetCommand);
	context.subscriptions.push(groundProgramCommand);
	context.subscriptions.push(linkFilesCommand);
	context.subscriptions.push(unlinkFilesCommand);
	context.subscriptions.push(disbandPoolCommand);
	context.subscriptions.push(viewAllPoolsCommand);
	context.subscriptions.push(viewCurrentFilePoolCommand);

	let aspCompletionItemProvider = autocomplete.getASPCompletionItemProvider(context);

	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('asp', aspCompletionItemProvider, '#', '&'));
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}

function getContentForWebview(webview, extensionUri) {

	const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'css', 'reset.css'));
	const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'css', 'vscode.css'));
	const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "css", "main.css"));
	const styleIconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "css", "icons.css"));
	const scriptMainUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "js", "main.js"))

	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<link href="${styleResetUri}" rel="stylesheet">
		<link href="${styleVSCodeUri}" rel="stylesheet">
		<link href="${styleMainUri}" rel="stylesheet">
		<link href="${styleIconsUri}" rel="stylesheet">
		
		<title>DLV2 interface</title>
	</head>
	<body>
		<div id="container">

			<label for="add-option-button" class="container-item">Options</label>
			<button id="add-option-button" class="container-item"><i class="fas fa-plus" id="plus-icon"></i>Add option</button>

			<div id="options"></div>

			<button id="run-button" class="container-item"><i class="fas fa-play" id="play-icon"></i>Run</button>

			<div id="error"></div>

			<script src="${scriptMainUri}"></script>
		</div>
	</body>
	</html>`;
}