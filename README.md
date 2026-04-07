# tcglookup

[![npm version](https://img.shields.io/npm/v/tcglookup.svg)](https://www.npmjs.com/package/tcglookup)
[![license](https://img.shields.io/npm/l/tcglookup.svg)](https://github.com/TCG-Price-Lookup/tcglookup-cli/blob/main/LICENSE)

Live trading card prices in your terminal — **Pokemon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, Disney Lorcana, Star Wars: Unlimited, Flesh and Blood,** and **Pokemon Japan**. Powered by the [TCG Price Lookup API](https://tcgpricelookup.com/tcg-api).

```bash
$ tcglookup search charizard --game pokemon --limit 3

┌────────────────────────────┬──────────────────────────┬────────────┬──────────┬────────────┬──────────────┐
│ Name                       │ Set                      │ Game       │ #        │ Variant    │ NM market    │
├────────────────────────────┼──────────────────────────┼────────────┼──────────┼────────────┼──────────────┤
│ Charizard                  │ Base Set                 │ Pokemon    │ 4/102    │ Standard   │ $488.20      │
│ Charizard                  │ XY - Evolutions          │ Pokemon    │ 11/108   │ Standard   │ $71.56       │
│ Charizard ex               │ Obsidian Flames          │ Pokemon    │ 6/197    │ Standard   │ $48.97       │
└────────────────────────────┴──────────────────────────┴────────────┴──────────┴────────────┴──────────────┘
Showing 3 of 557 matches.
```

---

## Install

```bash
npm install -g tcglookup
```

## Get an API key

The CLI is a thin wrapper around the [TCG Price Lookup API](https://tcgpricelookup.com/tcg-api). You'll need a free API key — get one in 30 seconds at <https://tcgpricelookup.com/tcg-api> (no credit card on the Free tier).

```bash
tcglookup auth login
# Paste your key when prompted. Saved with file mode 600 to:
#   ~/.config/tcglookup/config.json
```

Or set `TCG_API_KEY` in your environment — that wins over the stored key, which is handy for CI / one-off scripts.

## Commands

### Search

```bash
tcglookup search "charizard"
tcglookup search "black lotus" --game mtg
tcglookup search charizard --game pokemon --set obsidian-flames --limit 5
```

Options: `--game <slug>`, `--set <slug>`, `--ids <comma-separated>`, `--limit <n>`, `--offset <n>`, `--json`.

### Get full card details

```bash
tcglookup get 019535a1-d5d0-7c12-a3e8-b7f4c6d8e9a2
```

Returns every condition (Near Mint → Damaged), every grader (PSA, BGS, CGC, SGC, …), every grade (1-10), and TCGPlayer market + low/mid/high.

### Price history (Trader plan and above)

```bash
tcglookup history 019535a1-d5d0-7c12-a3e8-b7f4c6d8e9a2 --period 30d
```

Periods: `7d`, `30d`, `90d`, `1y`. Includes a tiny ASCII sparkline of the price trend and a percentage delta from start to end.

### List sets

```bash
tcglookup sets pokemon
tcglookup sets mtg --limit 10
```

### List supported games

```bash
tcglookup games
```

### Auth management

```bash
tcglookup auth status     # show whether a key is configured
tcglookup auth login      # set a key (interactive prompt)
tcglookup auth login --key tcg_xxx   # set a key non-interactively
tcglookup auth logout     # delete the stored key
```

## Pipe-friendly output

Every command supports `--json` for shell scripting:

```bash
# Just the market price of the first hit
tcglookup search charizard --game pokemon --json \
  | jq '.data[0].prices.raw.near_mint.tcgplayer.market'

# Total value of a portfolio (one card ID per line in ids.txt)
tcglookup search --ids "$(paste -sd , ids.txt)" --json \
  | jq '[.data[].prices.raw.near_mint.tcgplayer.market | select(. != null)] | add'
```

## Supported games

| Slug         | Game                    |
|--------------|-------------------------|
| `pokemon`    | Pokémon (English)       |
| `pokemon-jp` | Pokémon Japan           |
| `mtg`        | Magic: The Gathering    |
| `yugioh`     | Yu-Gi-Oh!               |
| `onepiece`   | One Piece Card Game     |
| `lorcana`    | Disney Lorcana          |
| `swu`        | Star Wars: Unlimited    |
| `fab`        | Flesh and Blood         |

## Plan tiers

The Free tier returns **raw TCGPlayer prices only**. The eBay sold-listing data, PSA/BGS/CGC graded values, and the `history` command require the **Trader** plan or above. The CLI surfaces this clearly when you hit a paywall:

```
✖ Your plan does not include this resource.

History endpoint requires trader plan or above

Upgrade at https://tcgpricelookup.com/pricing
```

See <https://tcgpricelookup.com/pricing> for current quotas.

## Exit codes

| Code | Meaning |
|------|---------|
| `0`  | Success |
| `1`  | Generic error (bad arguments, etc.) |
| `2`  | No API key configured |
| `3`  | Invalid API key (401) |
| `4`  | Plan does not include resource (403) |
| `5`  | Not found (404) |
| `6`  | Rate limit exceeded (429) |
| `7`  | Other API error (5xx) |

Useful for scripting.

## Built on

- The official [`@tcgpricelookup/sdk`](https://www.npmjs.com/package/@tcgpricelookup/sdk) — same package powers any JS/TS app you build.

## License

MIT © TCG Price Lookup
