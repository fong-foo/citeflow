# Contributing to CiteFlow

Thanks for your interest in contributing. CiteFlow is a GEO (Generative Engine Optimization) platform that helps brands understand and improve their visibility in AI-powered search engines.

## How to Contribute

1. **Open an issue** first to discuss what you'd like to change
2. **Fork the repo** and create a feature branch
3. **Keep changes focused** — one PR, one concern
4. **Add tests** if you're changing core logic
5. **Run the demo** (`bash examples/run-demo.sh`) to verify nothing is broken

## Development Setup

```bash
git clone https://github.com/fong-foo/citeflow.git
cd citeflow
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
bash examples/run-demo.sh
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your API keys. Never commit `.env` files.

## Code Style

- Python: standard PEP 8
- TypeScript/React: follow existing patterns in `frontend/`
- Keep imports organized — stdlib first, then third-party, then local

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license.
