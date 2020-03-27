# digital-asm 

[![](https://vsmarketplacebadge.apphb.com/version/Herbert-Karl.digital-asm.svg)](https://marketplace.visualstudio.com/items?itemName=Herbert-Karl.digital-asm)

This VS Code Plugin provides support for Assembler files for the _digital logic designer and circuit simulator_ [Digital](https://github.com/hneemann/Digital).
It is created as part of a study work at the DHBW Mosbach.

## Features

* Language Grammar Definition for the Assembler
* Commands
  * Parsing `.asm` into `.hex` and `.lst`
  * Running file in the digital simulator
* code completion for asm mnemonics
* hover texts for asm mnemonics

## Requirements

* Circuit simulator [Digital](https://github.com/hneemann/Digital) for the digital processor.
* Assembler [ASM 3](https://github.com/hneemann/Assembler) for parsing the file.

These are not included in the extension and have to be downloaded seperately.

## Extension Settings

This extension contributes the following settings:

* `asm.simulatorHost`: ip address of the host running the digital simulator 
* `asm.simulatorPort`: port, at which the digital simulator runs its TcpListener
* `asm.assembler`: location of the jar file of the ASM3 programm
* `asm.brkHandling`: option to handle BRK Mnemonics as BreakPoints when debugging

## Known Issues

* Chars not recognized
* octal numbers not specifically recognized

If you find anything else, please open an issue on GitHub.

## Release Notes

please check the [CHANGELOG.md](CHANGELOG.md) file for release notes.
