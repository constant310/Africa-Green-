# Acres of Diamond Multipurpose Cooperative — Production V3

This branch preserves the complete V3 source snapshot recovered from the current Acres of Diamond cooperative production application.

## Source snapshot
The complete source is stored in `cooperative-production-v3-source.tar.gz` at the root of this branch.

Extract it with:

```bash
tar -xzf cooperative-production-v3-source.tar.gz
```

The snapshot includes the Next.js App Router frontend, Supabase authentication/RPC integration, Google OAuth flow, member portal, wallet, savings, shares, loans, withdrawals, transaction PIN, sessions, admin maker-checker workflow, and TOTP MFA UI. Real secret environment values are intentionally not committed.

Production reference: https://cooperative-production-v3.vercel.app
