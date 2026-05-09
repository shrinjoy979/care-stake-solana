import pkg from "@coral-xyz/anchor";
const { BN, AnchorProvider, Program, workspace, web3 } = pkg;
import { Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("init", () => {
  const provider = AnchorProvider.env();
  pkg.setProvider(provider);
  const program = workspace.CryptoHealthcare as any;

  it("initialize_protocol", async () => {
    const [protocolPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      program.programId
    );

    const existing = await provider.connection.getAccountInfo(protocolPda);
    if (existing) {
      console.log("✓ Already initialized");
      return;
    }

    const healthMintKp = Keypair.generate();
    const treasuryKp   = Keypair.generate();

    const tx = await program.methods
      .initializeProtocol(new BN("1000000000000000"))
      .accounts({
        protocolState: protocolPda,
        healthMint:    healthMintKp.publicKey,
        treasury:      treasuryKp.publicKey,
        authority:     provider.wallet.publicKey,
        tokenProgram:  TOKEN_PROGRAM_ID,
      })
      .signers([healthMintKp, treasuryKp])
      .rpc();

    console.log("✓ TX:", tx);
    const state = await program.account.protocolState.fetch(protocolPda);
    console.log("✓ healthMint:", state.healthMint.toBase58());
    console.log("✓ treasury:  ", state.treasury.toBase58());
  });
});