const grouding_solving = require('./grounding-solving.js');
const vscode = require('vscode');

//Returns a WebviewViewProvider that manages the advanced options webview
function getWebviewViewProvider(context) {
    return {
        resolveWebviewView:function(thisWebviewView){
            thisWebviewView.webview.options={enableScripts:true}
            thisWebviewView.webview.html = getContentForWebview(thisWebviewView.webview, context.extensionUri);
			thisWebviewView.webview.onDidReceiveMessage(message => {
				grouding_solving.runDLV2(context, message);
			});
        }
    };
}

//Returns the html content of the advanced options webview
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

module.exports = {
    getWebviewViewProvider
};