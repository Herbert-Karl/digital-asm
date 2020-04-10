export interface AsmMnemonic {
    label: string;
    detail: string;
    doc: string;
}

export const mnemonicsArray: Array<AsmMnemonic> = [
    {label: "BRK", detail: "BRK", doc: "Stops execution by stopping the simulator."},
    {label: "NOP", detail: "NOP", doc: "Does nothing."},
    {label: "MOV", detail: "MOV Rd,Rs", doc: "Move the content of Rs to register Rd."},
    //
    {label: "ADD", detail: "ADD Rd,Rs", doc: "Adds the content of register Rs to register Rd without carry."},
    {label: "ADC", detail: "ADC Rd,Rs", doc: "Adds the content of register Rs to register Rd with carry."},
    {label: "ADDI", detail: "ADDI Rd,[const]", doc: "Adds the constant [const] to register Rd without carry."},
    {label: "ADDIs", detail: "ADDIs Rd,[const]", doc: "Adds the constant [const] to register Rd without carry. (0<=[const]<=31)"},
    {label: "ADCI", detail: "ADCI Rd,[const]", doc: "Adds the constant [const] to register Rd with carry."},
    {label: "ADCIs", detail: "ADCIs Rd,[const]", doc: "Adds the constant [const] to register Rd with carry. (0<=[const]<=31)"},
    //
    {label: "SUB", detail: "SUB Rd,Rs", doc: "Subtracts the content of register Rs to register Rd without carry."},
    {label: "SBC", detail: "SBC Rd,Rs", doc: "Subtracts the content of register Rs to register Rd with carry."},
    {label: "SUBI", detail: "SUBI Rd,[const]", doc: "Substracts a constant [const] to register Rd without carry."},
    {label: "SUBIs", detail: "SUBIs Rd,[const]", doc: "Substracts a constant [const] to register Rd without carry. (0<=[const]<=31)"},
    {label: "SBCI", detail: "SBCI Rd,[const]", doc: "Substracts a constant [const] to register Rd with carry."},
    {label: "SBCIs", detail: "SBCIs Rd,[const]", doc: "Substracts a constant [const] to register Rd with carry. (0<=[const]<=31)"},
    //
    {label: "MUL", detail: "MUL Rd,Rs", doc: "Multiplies the content of register Rs with register Rd and stores result in Rd."},
    {label: "MULI", detail: "MULI Rd,[const]", doc: "Multiplies the constant [const] with register Rd and stores result in Rd."},
    {label: "MULIs", detail: "MULIs Rd,[const]", doc: "Multiplies the constant [const] with register Rd and stores result in Rd. (0<=[const]<=31)"},
    //
    {label: "AND", detail: "AND Rd,Rs", doc: "Stores Rs and Rd in register Rd."},
    {label: "ANDI", detail: "ANDI Rd,[const]", doc: "Stores Rd and [const] in register Rd."},
    {label: "ANDIs", detail: "ANDIs Rd,[const]", doc: "Stores Rd and [const] in register Rd. (0<=[const]<=31)"},
    {label: "OR", detail: "OR Rd,Rs", doc: "Stores Rs or Rd in register Rd."},
    {label: "ORI", detail: "ORI Rd,[const]", doc: "Stores Rd or [const] in register Rd."},
    {label: "ORIs", detail: "ORIs Rd,[const]", doc: "Stores Rd or [const] in register Rd. (0<=[const]<=31)"},
    {label: "EOR", detail: "EOR Rd,Rs", doc: "Stores Rs xor Rd in register Rd."},
    {label: "EORI", detail: "EORI Rd,[const]", doc: "Stores Rd xor [const] in register Rd."},
    {label: "EORIs", detail: "EORIs Rd,[const]", doc: "Stores Rd xor [const] in register Rd. (0<=[const]<=31)"},
    //
    {label: "CMP", detail: "CMP Rd,Rs", doc: "Subtracts the content of register Rs from register Rd without carry, does not store the value."},
    {label: "CPI", detail: "CPI Rd,[const]", doc: "Subtracts a constant [const] from register Rd without carry, does not store the value."},
    {label: "CPIs", detail: "CPIs Rd,[const]", doc: "Subtracts a constant [const] from register Rd without carry, does not store the value. (0<=[const]<=31)"},
    //
    {label: "LSL", detail: "LSL Rd", doc: "Shifts register Rd by one bit to the left. A zero bit is filled in and the highest bit is moved to the carry bit."},
    {label: "LSR", detail: "LSR Rd", doc: "Shifts register Rd by one bit to the right. A zero bit is filled in and the lowest bit is moved to the carry bit."},
    {label: "ROL", detail: "ROL Rd", doc: "Shifts register Rd by one bit to the left. The carry bit is filled in and the highest bit is moved to the carry bit."},
    {label: "ROR", detail: "ROR Rd", doc: "Shifts register Rd by one bit to the right. The carry bit is filled in and the lowest bit is moved to the carry bit."},
    {label: "ASR", detail: "ASR Rd", doc: "Shifts register Rd by one bit to the right. The MSB remains unchanged and the lowest bit is moved to the carry bit."},
    {label: "SWAP", detail: "SWAP Rd", doc: "Swaps the high and low byte in register Rd"},
    {label: "SWAPN", detail: "SWAPN Rd", doc: "Swaps the high and low nibbles of both bytes in register Rd."},
    //
    {label: "LDI", detail: "LDI Rd,[const]", doc: "Loads Register Rd with the constant value [const]."},
    {label: "LDIs", detail: "LDI Rd,[const]", doc: "Loads Register Rd with the constant value [const]. (0<=[const]<=31)"},
    {label: "LD", detail: "LD Rd,[Rs]", doc: "Loads the value at memory address [Rs] to register Rd."},
    {label: "LDS", detail: "LDS Rd,[const]", doc: "Loads the memory value at the location given by [const] to register Rd."},
    {label: "LDSs", detail: "LDSs Rd,[const]", doc: "Loads the memory value at the location given by [const] to register Rd. (0<=[const]<=31)"},
    {label: "LDD", detail: "LDD Rd,[Rs+[const]]", doc: "Loads the value at memory address (Rs+[const]) to register Rd."},
    //
    {label: "ST", detail: "ST [Rd],Rs", doc: "Stores the content of register Rs to the memory at the address [Rd]."},
    {label: "STS", detail: "STS [const],Rs", doc: "Stores the content of register Rs to memory at the location given by [const]."},
    {label: "STSs", detail: "STSs [const],Rs", doc: "Stores the content of register Rs to memory at the location given by [const]. (0<=[const]<=31)"},
    {label: "STD", detail: "STD [Rd+[const]],Rs", doc: "Stores the content of register Rs to the memory at the address (Rd+[const])."},
    //
    {label: "BRCS", detail: "BRCS [const]", doc: "Jumps to the address given by [const] if carry flag is set. (-256<=[const]<=255)"},
    {label: "BREQ", detail: "BREQ [const]", doc: "Jumps to the address given by [const] if zero flag is set. (-256<=[const]<=255)"},
    {label: "BRMI", detail: "BRMI [const]", doc: "Jumps to the address given by [const] if negative flag is set. (-256<=[const]<=255)"},
    {label: "BRCC", detail: "BRCC [const]", doc: "Jumps to the address given by [const] if carry flag is clear. (-256<=[const]<=255)"},
    {label: "BRNE", detail: "BRNE [const]", doc: "Jumps to the address given by [const] if zero flag is clear. (-256<=[const]<=255)"},
    {label: "BRPL", detail: "BRPL [const]", doc: "Jumps to the address given by [const] if negative flag is clear. (-256<=[const]<=255)"},
    //
    {label: "RCALL", detail: "RCALL Rd,[const]", doc: "Jumps to the address given by const, the return address is stored in register Rd."},
    {label: "RRET", detail: "RRET Rs", doc: "Jumps to the address given by register Rs."},
    {label: "JMP", detail: "JMP [const]", doc: "Jumps to the address given by [const]."},
    {label: "JMPs", detail: "JMPs [const]", doc: "Jumps to the address given by [const]. (-256<=[const]<=255)"},
    //
    {label: "OUT", detail: "OUT [const],Rs", doc: "Writes the content of register Rs to io location given by [const]."},
    {label: "OUTs", detail: "OUTs [const],Rs", doc: "Writes the content of register Rs to io location given by [const]. (0<=[const]<=31)"},
    {label: "OUTR", detail: "OUTR [Rd],Rs", doc: "Writes the content of register Rs to the io location [Rd]."},
    {label: "IN", detail: "IN Rd,[const]", doc: "Reads the io location given by [const] and stores it in register Rd."},
    {label: "INs", detail: "INs Rd,[const]", doc: "Reads the io location given by [const] and stores it in register Rd. (0<=[const]<=31)"},
    {label: "INR", detail: "INR Rd,[Rs]", doc: "Reads the io location given by (Rs) and stores it in register Rd."},
    //
    {label: "RETI", detail: "RETI", doc: "Return from Interrupt."},
    //
    // --- macros ---
    //
    {label: "PUSH",  detail: "PUSH Rs", doc: "Copies the value in the given register to the stack, decreases the stack pointer by one."},
    {label: "POP", detail: "POP Rd", doc: "Copy value from the stack to the given register, adds one to the stack pointer."},
    //
    {label: "CALL", detail: "CALL [const]", doc: "Jumps to the given Address, stores the return address on the stack."},
    {label: "RET", detail: "RET [const]", doc: "Jumps to the address which is stored on top of the stack. decreases the stack pointer by 1+const. const is optional."},
    //
    {label: "LEAVE", detail: "LEAVE", doc: "Moves BP to SP and pops BP from the stack."},
    {label: "LEAVEI", detail: "LEAVEI", doc: "Pops R0 and the flags from the stack."},
    {label: "ENTER", detail: "ENTER [const]", doc: "Pushes BP on stack, copies SP to BP and reduces SP by the given constant."},
    {label: "ENTERI", detail: "ENTERI", doc: "Pushes R0 and the flags to the stack."},
    {label: "_SCALL", detail: "_SCALL [const]", doc: "Jumps to the address given in const and stores the return address in the register RA. Before that RA is pushed to the stack, and after the return RA is poped of the stack again."},
    //
    {label: "DEC", detail: "DEC Rd", doc: "Decreases the given register by one."},
    {label: "INC", detail: "INC Rd", doc: "Increases the given register by one."},
    //
    // --- directives ---
    //
    {label: ".reg", detail: ".reg alias Rs", doc: "Sets an alias name for a register."},
    {label: ".long", detail: ".long addr", doc: "Reserves two words in the RAM. Its address is stored in addr."},
    {label: ".org", detail: ".org addr", doc: "Sets the actual code address. Is used to place code segments to fixed addresses."},
    {label: ".const", detail: ".const ident const", doc: "Creates the given constant."},
    {label: ".include", detail: ".include \"filename\"", doc: "Includes the given file."},
    {label: ".word", detail: ".word addr", doc: "Reserves a single word in the RAM. Its address is stored in addr."},
    {label: ".dorg", detail: ".dorg addr", doc: "Sets the actual data address. If used, assembler is switched to von Neumann mode."},
    {label: ".data", detail: ".data addr value(,value)*", doc: "Copies the given values to the RAM. The address of the values is stored in addr."},
    
];