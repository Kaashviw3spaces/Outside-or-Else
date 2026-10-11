import { createContext, useContext } from 'react'
import type { ChallengeState } from './rules'
import type { Legacy } from './service'
export interface ChallengeView {state:ChallengeState|null;legacy:Legacy[];loading:boolean;error:string;configure:(action:'enable'|'disable'|'pause'|'resume')=>Promise<void>;refresh:()=>void}
export const ChallengeContext=createContext<ChallengeView|null>(null)
export const useChallenge=()=>useContext(ChallengeContext)
