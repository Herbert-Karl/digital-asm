/*
Copyright © 2021 Herbert Bärschneider

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
import * as vscode from 'vscode';
import { mnemonicsArray, AsmMnemonic } from './mnemonics';

// class containing our provided completions for asm files
export class AsmCompletionItemProvider implements vscode.CompletionItemProvider {

    // for collecting all of our completions for the mnemonics of the assembler
    private mnemonicCompletionItems: Array<vscode.CompletionItem>;

    constructor() {
        // because the mnemonic completion items are static, we create them once and store them
        this.mnemonicCompletionItems = new Array<vscode.CompletionItem>();
        // putting all of our mnemonics into the array of completion items
        mnemonicsArray.forEach((elem: AsmMnemonic) => {
            this.mnemonicCompletionItems.push(createCompletionItem(elem.label, elem.detail, elem.doc, vscode.CompletionItemKind.Keyword));
        });
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        return this.mnemonicCompletionItems;
    }
}
function createCompletionItem(label: string, detail: string, doc: string, kind: vscode.CompletionItemKind): vscode.CompletionItem {
    let newCompletionItem = new vscode.CompletionItem(label, kind);
    newCompletionItem.detail = detail;
    newCompletionItem.documentation = doc;
    return newCompletionItem;
}
