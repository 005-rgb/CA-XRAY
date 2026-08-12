# CA X-RAY

CA X-RAY is an evidence-based crypto contract forensic analyzer. It accepts an EVM contract address, validates the selected supported network, and produces either a clearly labeled deterministic demo report or a LIVE report assembled from GoPlus Security and DexScreener data.

## Run

```bash
npm run dev
```

The app listens on port 5000. Run the deterministic engine checks with:

```bash
npm test
```

## Product boundaries

- No wallet connection, private keys, signatures, transactions, trading, or financial recommendations.
- Unknown, unavailable, and provider-error values remain explicitly labeled and are never converted to zero.
- Demo fixtures never mix with live provider data.
- Risk score and reliability score are separate calculations.

## User preferences

- Precision and evidence take priority over feature count.
- Keep the experience minimal, professional, forensic, and readable.