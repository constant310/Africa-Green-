import Link from 'next/link';

export default function PrivacyPage(){
 return <main className="pageShell"><section className="card" style={{maxWidth:900,margin:'40px auto'}}><p className="eyebrow">Privacy & data protection</p><h1>How member information is handled</h1><p className="muted">Acres of Diamond Multipurpose Cooperative Society uses member information only for cooperative administration, identity verification, payments, savings, loans, support, statutory records and security.</p><div className="formGrid">
 <div><h2>Information we process</h2><p>Account details, contact information, membership records, payment references, wallet and ledger activity, loan and guarantor records, KYC verification results, support messages and security/audit events.</p></div>
 <div><h2>Sensitive identity data</h2><p>Identity numbers and provider credentials are not displayed in audit exports or member notifications. Identity verification is handled through approved verification providers and protected server-side endpoints.</p></div>
 <div><h2>Access and security</h2><p>Access is role-based. Administrative actions are audited. Financial and sensitive operations may require additional verification such as a transaction PIN or stronger authentication.</p></div>
 <div><h2>Sharing</h2><p>Data may be shared only with service providers required to operate the cooperative platform, payment processors, identity-verification providers, regulators or authorities where legally required.</p></div>
 <div><h2>Retention</h2><p>Records are retained for as long as required for cooperative administration, financial reconciliation, dispute handling, statutory obligations and fraud prevention.</p></div>
 <div><h2>Your responsibility</h2><p>Keep your login credentials and transaction PIN private. Report suspected unauthorized access promptly through the support channel.</p></div>
 </div><p className="muted" style={{marginTop:24}}>This operational privacy notice should be read together with the Society's registered bye-laws and any formally adopted data-protection policy.</p><div className="actions"><Link className="btn" href="/terms">Terms of use</Link><Link className="btn primary" href="/">Back home</Link></div></section></main>;
}
