import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Carestake } from "../target/types/carestake";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import * as crypto from "crypto";

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
const hashString = (s: string): number[] =>
  Array.from(crypto.createHash("sha256").update(s).digest());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────
//  Test Suite
// ─────────────────────────────────────────────
describe("crypto_healthcare", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Carestake as Program<Carestake>;
  const connection = provider.connection;
  const authority = provider.wallet as anchor.Wallet;

  // Keypairs
  const healthMintKp = Keypair.generate();
  const treasuryKp = Keypair.generate();
  const patientKp = Keypair.generate();
  const practitionerKp = Keypair.generate();

  // PDAs
  let protocolPDA: PublicKey;
  let patientProfilePDA: PublicKey;
  let practitionerProfilePDA: PublicKey;
  let stakePotPDA: PublicKey;

  // Token accounts
  let patientTokenAccount: PublicKey;
  let practitionerTokenAccount: PublicKey;
  let potVaultKp = Keypair.generate();

  const INITIAL_SUPPLY = new anchor.BN(10_000_000 * 1_000_000); // 10M tokens
  const ONBOARDING_TOKENS = new anchor.BN(1_000 * 1_000_000);   // 1,000 $HEALTH
  const PATIENT_STAKE = new anchor.BN(500 * 1_000_000);         // 500 $HEALTH
  const PRACTITIONER_STAKE = new anchor.BN(500 * 1_000_000);    // 500 $HEALTH

  before(async () => {
    // Airdrop SOL to test wallets
    for (const kp of [patientKp, practitionerKp]) {
      const sig = await connection.requestAirdrop(kp.publicKey, 2e9);
      await connection.confirmTransaction(sig);
    }
    await sleep(500);

    // Derive PDAs
    [protocolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      program.programId
    );
    [patientProfilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("patient"), patientKp.publicKey.toBuffer()],
      program.programId
    );
    [practitionerProfilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("practitioner"), practitionerKp.publicKey.toBuffer()],
      program.programId
    );
    [stakePotPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake_pot"),
        patientKp.publicKey.toBuffer(),
        practitionerKp.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  // ── 1. Initialize Protocol ─────────────────

  it("Initializes the protocol and mints initial supply", async () => {
    const tx = await program.methods
      .initializeProtocol(INITIAL_SUPPLY)
      .accounts({
        protocolState: protocolPDA,
        healthMint: healthMintKp.publicKey,
        treasury: treasuryKp.publicKey,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([healthMintKp, treasuryKp])
      .rpc();

    console.log("  ✓ Protocol initialized:", tx);

    const state = await program.account.protocolState.fetch(protocolPDA);
    assert.equal(state.authority.toBase58(), authority.publicKey.toBase58());
    assert.equal(state.totalPatients.toNumber(), 0);
    assert.equal(state.totalPractitioners.toNumber(), 0);
  });

  // ── 2. Register Patient ────────────────────

  it("Registers a patient and airdrops onboarding tokens", async () => {
    // Create patient token account
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      patientKp,
      healthMintKp.publicKey,
      patientKp.publicKey
    );
    patientTokenAccount = ata.address;

    const nameHash = hashString("Alice Patient");

    const tx = await program.methods
      .registerPatient(nameHash, ONBOARDING_TOKENS)
      .accounts({
        patientProfile: patientProfilePDA,
        patientTokenAccount: patientTokenAccount,
        protocolState: protocolPDA,
        treasury: treasuryKp.publicKey,
        healthMint: healthMintKp.publicKey,
        patientWallet: patientKp.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([patientKp])
      .rpc();

    console.log("  ✓ Patient registered:", tx);

    const profile = await program.account.patientProfile.fetch(patientProfilePDA);
    assert.equal(profile.healthScore, 50);  // baseline
    assert.equal(profile.baselineScore, 50);

    const tokenBal = await getAccount(connection, patientTokenAccount);
    assert.equal(tokenBal.amount.toString(), ONBOARDING_TOKENS.toString());
  });

  // ── 3. Register Practitioner ───────────────

  it("Registers a practitioner", async () => {
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      practitionerKp,
      healthMintKp.publicKey,
      practitionerKp.publicKey
    );
    practitionerTokenAccount = ata.address;

    const nameHash = hashString("Dr. Chen Primary Care");

    const tx = await program.methods
      .registerPractitioner(
        nameHash,
        { primaryCare: {} },   // Specialization enum
        ONBOARDING_TOKENS
      )
      .accounts({
        practitionerProfile: practitionerProfilePDA,
        practitionerTokenAccount: practitionerTokenAccount,
        protocolState: protocolPDA,
        treasury: treasuryKp.publicKey,
        healthMint: healthMintKp.publicKey,
        practitionerWallet: practitionerKp.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([practitionerKp])
      .rpc();

    console.log("  ✓ Practitioner registered:", tx);

    const profile = await program.account.practitionerProfile.fetch(practitionerProfilePDA);
    assert.equal(profile.reputationScore, 50);
    assert.equal(profile.completedSessions, 0);
  });

  // ── 4. Open Stake Pot ──────────────────────

  it("Opens a stake pot between patient and practitioner", async () => {
    const DURATION_DAYS = 90;

    const tx = await program.methods
      .openStakePot(PATIENT_STAKE, PRACTITIONER_STAKE, DURATION_DAYS)
      .accounts({
        stakePot: stakePotPDA,
        potVault: potVaultKp.publicKey,
        patientProfile: patientProfilePDA,
        practitionerProfile: practitionerProfilePDA,
        patientTokenAccount: patientTokenAccount,
        practitionerTokenAccount: practitionerTokenAccount,
        protocolState: protocolPDA,
        healthMint: healthMintKp.publicKey,
        patientWallet: patientKp.publicKey,
        practitionerWallet: practitionerKp.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([patientKp, practitionerKp, potVaultKp])
      .rpc();

    console.log("  ✓ Stake pot opened:", tx);

    const pot = await program.account.stakePot.fetch(stakePotPDA);
    assert.equal(pot.totalAmount.toNumber(), PATIENT_STAKE.toNumber() + PRACTITIONER_STAKE.toNumber());
    assert.equal(pot.patientShareBps, 5000);
    assert.equal(pot.practitionerShareBps, 5000);
    assert.deepEqual(pot.status, { active: {} });

    const vault = await getAccount(connection, potVaultKp.publicKey);
    assert.equal(vault.amount.toString(), pot.totalAmount.toString());
  });

  // ── 5. Record Session — Positive Outcome ──

  it("Records a session with positive health outcome", async () => {
    const newScore = 65; // up from baseline 50
    const notesHash = hashString("Blood pressure improved after lifestyle changes");

    const [sessionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), stakePotPDA.toBuffer(), Buffer.from([0])],
      program.programId
    );

    const tx = await program.methods
      .recordSession(newScore, notesHash, { lifestyleChange: {} })
      .accounts({
        sessionRecord: sessionPDA,
        stakePot: stakePotPDA,
        patientProfile: patientProfilePDA,
        practitionerProfile: practitionerProfilePDA,
        protocolState: protocolPDA,
        practitionerWallet: practitionerKp.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([practitionerKp])
      .rpc();

    console.log("  ✓ Session recorded (positive):", tx);

    const pot = await program.account.stakePot.fetch(stakePotPDA);
    assert.equal(pot.currentHealthScore, newScore);
    // Practitioner should earn more than 50% after improvement
    assert.isAbove(pot.practitionerShareBps, 5000);

    const session = await program.account.sessionRecord.fetch(sessionPDA);
    assert.equal(session.healthScoreBefore, 50);
    assert.equal(session.healthScoreAfter, newScore);

    const prac = await program.account.practitionerProfile.fetch(practitionerProfilePDA);
    assert.equal(prac.positiveOutcomes, 1);
    console.log(`  → Practitioner share: ${pot.practitionerShareBps / 100}%`);
  });

  // ── 6. Record Session — Negative Outcome ──

  it("Records a session with negative outcome — slashing triggered", async () => {
    const newScore = 55; // down from 65
    const notesHash = hashString("Cholesterol increased after new medication");

    const [sessionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), stakePotPDA.toBuffer(), Buffer.from([1])],
      program.programId
    );

    const tx = await program.methods
      .recordSession(newScore, notesHash, { prescription: {} })
      .accounts({
        sessionRecord: sessionPDA,
        stakePot: stakePotPDA,
        patientProfile: patientProfilePDA,
        practitionerProfile: practitionerProfilePDA,
        protocolState: protocolPDA,
        practitionerWallet: practitionerKp.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([practitionerKp])
      .rpc();

    console.log("  ✓ Session recorded (negative / slash):", tx);

    const pot = await program.account.stakePot.fetch(stakePotPDA);
    const prac = await program.account.practitionerProfile.fetch(practitionerProfilePDA);
    assert.equal(prac.negativeOutcomes, 1);
    // Patient should gain share on negative outcome
    assert.isAbove(pot.patientShareBps, 5000);
    console.log(`  → Patient share after slash: ${pot.patientShareBps / 100}%`);
    console.log(`  → Practitioner reputation: ${prac.reputationScore}`);
  });

  // ── 7. Raise Dispute ──────────────────────

  it("Patient raises a dispute", async () => {
    const reasonHash = hashString("Prescribed unnecessary medication");

    const tx = await program.methods
      .raiseDispute(reasonHash)
      .accounts({
        stakePot: stakePotPDA,
        patientWallet: patientKp.publicKey,
      })
      .signers([patientKp])
      .rpc();

    console.log("  ✓ Dispute raised:", tx);

    const pot = await program.account.stakePot.fetch(stakePotPDA);
    assert.deepEqual(pot.status, { disputed: {} });
  });

  // ── 8. Resolve Dispute ────────────────────

  it("Oracle resolves dispute in favor of patient (30% slash)", async () => {
    const tx = await program.methods
      .resolveDispute(true, 30)
      .accounts({
        stakePot: stakePotPDA,
        practitionerProfile: practitionerProfilePDA,
        protocolState: protocolPDA,
        oracle: authority.publicKey,
      })
      .rpc();

    console.log("  ✓ Dispute resolved:", tx);

    const pot = await program.account.stakePot.fetch(stakePotPDA);
    assert.deepEqual(pot.status, { active: {} }); // reopened
    console.log(`  → Patient share after dispute: ${pot.patientShareBps / 100}%`);
  });

  // ── 9. Settle Pot ─────────────────────────

  it("Settles the stake pot and distributes tokens", async () => {
    const patientBefore = (await getAccount(connection, patientTokenAccount)).amount;
    const pracBefore = (await getAccount(connection, practitionerTokenAccount)).amount;

    const tx = await program.methods
      .settlePot()
      .accounts({
        stakePot: stakePotPDA,
        potVault: potVaultKp.publicKey,
        patientProfile: patientProfilePDA,
        practitionerProfile: practitionerProfilePDA,
        patientTokenAccount: patientTokenAccount,
        practitionerTokenAccount: practitionerTokenAccount,
        protocolState: protocolPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("  ✓ Pot settled:", tx);

    const patientAfter = (await getAccount(connection, patientTokenAccount)).amount;
    const pracAfter = (await getAccount(connection, practitionerTokenAccount)).amount;

    const patientGain = Number(patientAfter) - Number(patientBefore);
    const pracGain = Number(pracAfter) - Number(pracBefore);
    const totalDistributed = patientGain + pracGain;

    console.log(`  → Patient received: ${patientGain / 1_000_000} $HEALTH`);
    console.log(`  → Practitioner received: ${pracGain / 1_000_000} $HEALTH`);
    console.log(`  → Total distributed: ${totalDistributed / 1_000_000} $HEALTH`);

    assert.equal(totalDistributed, PATIENT_STAKE.toNumber() + PRACTITIONER_STAKE.toNumber());

    const pot = await program.account.stakePot.fetch(stakePotPDA);
    assert.deepEqual(pot.status, { settled: {} });
  });

  // ── 10. Oracle Health Update ──────────────

  it("Oracle updates patient health score with verified data", async () => {
    const dataSourceHash = hashString("wearable-device-id-xyz-2025");

    const tx = await program.methods
      .oracleUpdateHealth(78, dataSourceHash)
      .accounts({
        patientProfile: patientProfilePDA,
        protocolState: protocolPDA,
        oracle: authority.publicKey,
      })
      .rpc();

    console.log("  ✓ Oracle health update:", tx);

    const patient = await program.account.patientProfile.fetch(patientProfilePDA);
    assert.equal(patient.healthScore, 78);
  });

  // ── 11. Final State Check ─────────────────

  it("Verifies final protocol state", async () => {
    const state = await program.account.protocolState.fetch(protocolPDA);
    const patient = await program.account.patientProfile.fetch(patientProfilePDA);
    const prac = await program.account.practitionerProfile.fetch(practitionerProfilePDA);

    console.log("\n  ── Final State ──────────────────────");
    console.log(`  Patients:          ${state.totalPatients}`);
    console.log(`  Practitioners:     ${state.totalPractitioners}`);
    console.log(`  Total pots:        ${state.totalPots}`);
    console.log(`  Total slashed:     ${state.totalSlashed.toNumber() / 1_000_000} $HEALTH`);
    console.log(`  Patient score:     ${patient.healthScore}`);
    console.log(`  Prac reputation:   ${prac.reputationScore}`);
    console.log(`  Prac +outcomes:    ${prac.positiveOutcomes}`);
    console.log(`  Prac -outcomes:    ${prac.negativeOutcomes}`);
    console.log("  ─────────────────────────────────────\n");

    assert.equal(state.totalPatients.toNumber(), 1);
    assert.equal(state.totalPractitioners.toNumber(), 1);
    assert.equal(state.totalPots.toNumber(), 1);
  });
});