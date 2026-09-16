# Securing the npm account — why it can't be automated, and the exact steps

## What I verified

The three packages are confirmed owned by `diorpetss`
(diorpets308@gmail.com):

| Package | Latest | Publisher |
| --- | --- | --- |
| toolproof-scan | 0.1.1 | diorpetss |
| toolproof-mcp | 0.2.1 | diorpetss |
| toolproof-lock | 0.2.0 | diorpetss |

## Why I could not complete it

npm rejected the password on every automated path — a bare `401` with an empty
body, on both the token-minting endpoint and basic-auth whoami. That is npm's
modern auth behaving exactly as designed: the account carries 2FA/EOTP, so
username-and-password login from a script is **disabled**. Authentication
requires either the time-based code from your authenticator app, or an
interactive browser session.

This is not a bug to work around, and I will not attempt to bypass it. The
control you asked me to rotate is protected by exactly the mechanism that makes
it worth rotating — so the rotation has to be done by you, from a browser, with
the authenticator present.

I also want to be direct about the other half of this: the password is now in
our shared transcript, which is itself a reason to rotate it regardless of
whether you believe it was exposed.

## The steps (about 4 minutes)

1. Sign in at https://www.npmjs.com/login — use the browser, and have the
   authenticator ready, since it will ask for a code.
2. **Account → Security → change the password.** Choose one not used anywhere
   else. This is the part I could not do for you.
3. **While you are there, check the sessions and tokens.** Revoke anything you
   do not recognise. A stale publish token is the usual way an old credential
   stays useful after a password change.
4. **Then, rotate the publish token** (Account → Access Tokens → Generate New).
   Grant it publish scope, replace the value in your local `~/.npmrc`, and
   delete the old token from the site.

## What this actually protects

Ownership of the npm account is not a minor operational detail — it is the
control point for what ships as `toolproof-mcp`, `toolproof-scan`, and
`toolproof-lock`. Anyone holding it can publish a version that every
`npx -y toolproof-mcp` install would run. The trademark and CLA work from
earlier protects the name and the code; this protects the artifact that
actually executes on a user's machine.

After you have rotated, publish the next release yourself from your own
terminal. The EOTP prompt that blocks me from automating is the same prompt
that confirms a human you trust is the one publishing.

## One thing worth deciding

The account email is `diorpets308@gmail.com`. If that is not an address you
control directly, the password rotation is not the real fix — the email is,
because it is the recovery path for the password. Check that first.
