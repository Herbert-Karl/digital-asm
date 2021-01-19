import * as assert from 'assert';
import * as net from 'net';
import { after, before } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { RemoteInterface } from '../../remoteInterface';

suite('RemoteInterface Test Suite', () => {
	before(() => {
		vscode.window.showInformationMessage('Start tests for RemoteInterface.');
	});
	after(() => {
		vscode.window.showInformationMessage('Finished tests for RemoteInterface!');
	  });

	test('Sending commands', async () => {
		let simpleTestServer = net.createServer();
		let hostName = "localhost";
		let tcpPort = 27322;
		simpleTestServer.listen(tcpPort, hostName);
		let staticAnswerString = "  ok:001f";
		simpleTestServer.on('connection', (socket) => {
			socket.write(staticAnswerString);
		});

		let remoteInterface = new RemoteInterface(hostName, tcpPort);
		let expectedAnswer = 31;
		assert.strictEqual(await remoteInterface.step(), expectedAnswer);
		assert.strictEqual(await remoteInterface.run(), expectedAnswer);

		simpleTestServer.close();
	});

    test('Sending wrong data', async () => {
		let simpleTestServer = net.createServer();
		let hostName = "localhost";
		let tcpPort = 27323;
		simpleTestServer.listen(tcpPort, hostName);
		let incorrectSocketMessage = "this is just wrong";
		simpleTestServer.on('connection', (socket) => {
			socket.write(incorrectSocketMessage);
		});

		let remoteInterface = new RemoteInterface(hostName, tcpPort);
		let response = await remoteInterface.run().catch((err)=>{ assert.strictEqual(err.message, "Error received from simulator: "+incorrectSocketMessage); });

		if(response!==undefined) {
			assert.fail("the function shouldn't have returned a value");
		}

		simpleTestServer.close();
	});

	test('No Server for connection', async () => {
		let hostName = "localhost";
		let tcpPort = 27325;
		let remoteInterface = new RemoteInterface(hostName, tcpPort);
		let response = await remoteInterface.run().catch((err)=>{ assert.strictEqual(err.code, "ECONNREFUSED"); });

		if(response!==undefined) {
			assert.fail("the function shouldn't have returned a value");
		}
    });

});
