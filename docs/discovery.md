# OpenCorporates: candidate discovery

This is the first HTTP-based source adapter. It is opt-in and only executed manually via GitHub Actions. **It does not publish data**.

1. Obtain authorized API access from OpenCorporates and check the licence (including share-alike requirements for eligible public-benefit projects).
2. Add GitHub Actions repository secret `OPENCORPORATES_API_TOKEN`. Never commit keys.
3. Supply a small list of *already verified* Italian registration numbers in `sources/discovery-seeds.json`, e.g. `{"jurisdiction_code":"it","company_number":"<exact number>"}`. No example identifiers are included to avoid false matches.
4. Run **External corporate discovery** using Actions → Run workflow.
5. Review the artifact `opencorporates-candidates.json`, verify identity against official source, check terms of redistribution, and only then convert to the approved import schema.

The adapter enforces the Italian jurisdiction and numerical registration identifier, caps each run at 10 requests, and stops on rate limiting or authorization errors. There is no name-based matching, automatic graph linking, scraping, or publication.
Useful references:
- https://api.opencorporates.com/documentation/API-Reference
- https://opencorporates.com/legal/licence/

Future connectors: ANAC open contracting CSV/JSON, EU Transparency Register exports, official issuer ownership disclosures. These require source-specific field mappings and review before activation.
