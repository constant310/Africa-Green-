import type {ReactNode} from 'react';
import WalletAutoSync from './WalletAutoSync';

export default function PortalLayout({children}:{children:ReactNode}){
 return <><WalletAutoSync/>{children}</>;
}
