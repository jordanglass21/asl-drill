# ASL Drill

Monkeytype for fingerspelling: the app shows a word, you fingerspell it to your webcam, and it grades each letter in real time. Everything runs in the browser.

Live at **https://asldrill.jordanglass.dev**. See [`SPEC.md`](SPEC.md) for scope and milestones.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm test
npm run eval:motion   # J/Z/double detector report over training/data/recordings
```

## Training

See [`training/README.md`](training/README.md). Record samples at `/record` (not linked from the app).

To practice specific words, open `/play?words=jazz,book,jelly`.
