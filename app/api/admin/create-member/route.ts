import {NextResponse} from 'next/server';

export async function POST(){
 return NextResponse.json({
  error:'Direct member creation is disabled. The person must create their own account first, complete registration, and only then can administration approve the membership application.'
 },{status:410,headers:{'Cache-Control':'no-store'}});
}
