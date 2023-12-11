// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { spawn } from 'child_process';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(extContext: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	vscode.window.showInformationMessage("Everything is gonna work");
	const agent = vscode.chat.createChatAgent('code-runner', async (request, context, progress, token) => {
		// progress.report({ content: 'Loading...' });
		const access = vscode.chat.requestChatAccess("copilot");
		const promptRequest = (await access).makeRequest([
			{ role: vscode.ChatMessageRole.System, content: `Here is the user's data analysis task. Only print the pyton code without any explanation. Import all needed builtin modules. At the end of code always user python "print" function to show the results.` },
			({ role: vscode.ChatMessageRole.User, content: request.prompt }),
		], {}, token);

		let response = "";
		let cnt = 0;
		let hasStartingCodeBlock = true;
		for await (const chunk of promptRequest.response){
			response += chunk;
			if (!chunk.startsWith("```") && cnt == 0) {
				progress.report({ content: "```python" });
				hasStartingCodeBlock = false;
			}
			progress.report({ content: chunk });
			cnt += 1;
		}
		if (!hasStartingCodeBlock) {
			progress.report({ content: "\n```" });
		}

		let python_code = response;
		// strip the code if starting with ```python or ``` and ending with ```
		// if (python_code.startsWith("```python")) {
		// 	python_code = python_code.slice(9);
		// }
		// if (python_code.startsWith("```")) {
		// 	python_code = python_code.slice(3);
		// }
		// if (python_code.endsWith("```")) {
		// 	python_code = python_code.slice(0, -3);
		// }

		// run the python code
		const result = await runPythonCode(python_code);
		progress.report({ content: "\n`" + result + "`" });


		// use vscode-python extension to run the code
		// progress.report({ content: '```' });
		// let followUpReply = vscode.
		return {};
	});

	agent.description = 'Code Runner';
	agent.fullName = 'Code Runner';
	agent.iconPath = new vscode.ThemeIcon('sparkle');
	console.log(agent);
	extContext.subscriptions.push(agent);

}

// This method is called when your extension is deactivated
export function deactivate() { }

function runPythonCode(pythonCode: string) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ['-']);
        let result = '';
        let error = '';

        // Write the Python code to the child process
        pythonProcess.stdin.write(pythonCode);
        pythonProcess.stdin.end();

        // Handle standard output
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        // Handle standard error
        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        // Handle process exit
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve(result);
            } else {
                reject(error);
            }
        });
    });
}