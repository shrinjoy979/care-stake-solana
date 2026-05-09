import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import idl from "../idl.json";

// ── Constants (mirrors lib.rs) ─────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("EjT1hTKBsGouxAfJJJjjH4FoMUda9bBYyGPuu3tknDVx");
const PATIENT_SEED = Buffer.from("patient");
const PRACTITIONER_SEED = Buffer.from("practitioner");
const PROTOCOL_SEED = Buffer.from("protocol");
const POT_SEED = Buffer.from("stake_pot");

// ── Types ──────────────────────────────────────────────────────────────────
export type PatientProfile = {
  wallet: PublicKey;
  healthScore: number;
  baselineScore: number;
  totalStaked: number;
  totalEarned: number;
  activePots: number;
  sessionCount: number;
  registeredAt: number;
};

export type StakePot = {
  publicKey: PublicKey;
  patient: PublicKey;
  practitioner: PublicKey;
  patientStaked: number;
  practitionerStaked: number;
  totalAmount: number;
  patientShareBps: number;
  practitionerShareBps: number;
  baselineHealthScore: number;
  currentHealthScore: number;
  sessionCount: number;
  status: string;
  expiresAt: number;
};

export type ProtocolState = {
  totalPatients: number;
  totalPractitioners: number;
  totalPots: number;
  totalSlashed: number;
  totalRewarded: number;
  healthMint: PublicKey;
};

// ── Hook ───────────────────────────────────────────────────────────────────
export function useHealthProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [program, setProgram] = useState<Program | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [activePots, setActivePots] = useState<StakePot[]>([]);
  const [protocolState, setProtocolState] = useState<ProtocolState | null>(null);
  const [healthBalance, setHealthBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Initialize program when wallet connects ──────────────────────────────
  useEffect(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
    const prog = new Program(idl, provider);
    setProgram(prog);
  }, [wallet.publicKey, connection]);

  // ── Fetch all on-chain data when program is ready ────────────────────────
  useEffect(() => {
    if (!program || !wallet.publicKey) return;
    fetchAll();
  }, [program, wallet.publicKey]);

  const fetchAll = useCallback(async () => {
    if (!program || !wallet.publicKey) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchPatientProfile(),
        fetchProtocolState(),
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey]);

  // ── Fetch patient profile PDA ────────────────────────────────────────────
  const fetchPatientProfile = useCallback(async () => {
    if (!program || !wallet.publicKey) return;
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [PATIENT_SEED, wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      const acc = await (program.account as any).patientProfile.fetch(pda);
      setPatientProfile({
        wallet: acc.wallet,
        healthScore: acc.healthScore,
        baselineScore: acc.baselineScore,
        totalStaked: acc.totalStaked.toNumber() / 1_000_000,
        totalEarned: acc.totalEarned.toNumber() / 1_000_000,
        activePots: acc.activePots,
        sessionCount: acc.sessionCount,
        registeredAt: acc.registeredAt.toNumber(),
      });

      // Fetch $HEALTH token balance
      await fetchTokenBalance(acc.wallet);

      // Fetch active pots
      await fetchActivePots(pda);
    } catch {
      // Patient not registered yet — this is expected for new users
      setPatientProfile(null);
    }
  }, [program, wallet.publicKey]);

  // ── Fetch $HEALTH token balance ──────────────────────────────────────────
  const fetchTokenBalance = useCallback(async (walletPubkey: PublicKey) => {
    if (!program || !protocolState?.healthMint) return;
    try {
      const ata = await getAssociatedTokenAddress(protocolState.healthMint, walletPubkey);
      const bal = await connection.getTokenAccountBalance(ata);
      setHealthBalance(Number(bal.value.uiAmount ?? 0));
    } catch {
      setHealthBalance(0);
    }
  }, [program, protocolState, connection]);

  // ── Fetch all stake pots for this patient ────────────────────────────────
  const fetchActivePots = useCallback(async (_patientPda: PublicKey) => {
    if (!program || !wallet.publicKey) return;
    try {
      const allPots = await (program.account as any).stakePot.all([
        { memcmp: { offset: 8, bytes: wallet.publicKey.toBase58() } },
      ]);
      setActivePots(
        allPots.map((p: any) => ({
          publicKey: p.publicKey,
          patient: p.account.patient,
          practitioner: p.account.practitioner,
          patientStaked: p.account.patientStaked.toNumber() / 1_000_000,
          practitionerStaked: p.account.practitionerStaked.toNumber() / 1_000_000,
          totalAmount: p.account.totalAmount.toNumber() / 1_000_000,
          patientShareBps: p.account.patientShareBps,
          practitionerShareBps: p.account.practitionerShareBps,
          baselineHealthScore: p.account.baselineHealthScore,
          currentHealthScore: p.account.currentHealthScore,
          sessionCount: p.account.sessionCount,
          status: Object.keys(p.account.status)[0],
          expiresAt: p.account.expiresAt.toNumber(),
        }))
      );
    } catch {
      setActivePots([]);
    }
  }, [program, wallet.publicKey]);

  // ── Fetch protocol global state ──────────────────────────────────────────
  const fetchProtocolState = useCallback(async () => {
    if (!program) return;
    try {
      const [pda] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], PROGRAM_ID);
      const acc = await (program.account as any).protocolState.fetch(pda);
      setProtocolState({
        totalPatients: acc.totalPatients.toNumber(),
        totalPractitioners: acc.totalPractitioners.toNumber(),
        totalPots: acc.totalPots.toNumber(),
        totalSlashed: acc.totalSlashed.toNumber() / 1_000_000,
        totalRewarded: acc.totalRewarded.toNumber() / 1_000_000,
        healthMint: acc.healthMint,
      });
    } catch {
      setProtocolState(null);
    }
  }, [program]);

  // ── Register patient ─────────────────────────────────────────────────────
  const registerPatient = useCallback(async (name: string) => {
    if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      const nameHash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(name)))
      );

      const [protocolPda] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], PROGRAM_ID);
      const [patientPda] = PublicKey.findProgramAddressSync(
        [PATIENT_SEED, wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const protocolAcc = await (program.account as any).protocolState.fetch(protocolPda);

      const tx = await (program.methods as any)
        .registerPatient(nameHash, new BN(500_000_000)) // 500 $HEALTH onboarding
        .accounts({
          patientProfile: patientPda,
          patientWallet: wallet.publicKey,
          protocolState: protocolPda,
          treasury: protocolAcc.treasury ?? protocolAcc.healthMint, // adjust per IDL
          healthMint: protocolAcc.healthMint,
          tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Registered patient:", tx);
      await fetchAll();
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey, fetchAll]);

  // ── Open stake pot ───────────────────────────────────────────────────────
  const openStakePot = useCallback(async (
    practitionerWallet: PublicKey,
    patientStake: number,   // in $HEALTH (not lamports)
    practitionerStake: number,
    durationDays: number,
  ) => {
    if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      const [protocolPda] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], PROGRAM_ID);
      const [patientPda] = PublicKey.findProgramAddressSync(
        [PATIENT_SEED, wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      const [pracPda] = PublicKey.findProgramAddressSync(
        [PRACTITIONER_SEED, practitionerWallet.toBuffer()],
        PROGRAM_ID
      );
      const [potPda] = PublicKey.findProgramAddressSync(
        [POT_SEED, wallet.publicKey.toBuffer(), practitionerWallet.toBuffer()],
        PROGRAM_ID
      );

      const tx = await (program.methods as any)
        .openStakePot(
          new BN(patientStake * 1_000_000),
          new BN(practitionerStake * 1_000_000),
          durationDays,
        )
        .accounts({
          stakePot: potPda,
          patientProfile: patientPda,
          practitionerProfile: pracPda,
          patientWallet: wallet.publicKey,
          practitionerWallet,
          protocolState: protocolPda,
          tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Stake pot opened:", tx);
      await fetchAll();
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey, fetchAll]);

  return {
    // state
    program,
    patientProfile,
    activePots,
    protocolState,
    healthBalance,
    loading,
    error,
    isRegistered: patientProfile !== null,
    // actions
    registerPatient,
    openStakePot,
    refetch: fetchAll,
  };
}