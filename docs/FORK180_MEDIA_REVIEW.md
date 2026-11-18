# openForm: 180px openGym exercise media – review and optional staging

Source reviewed 2026-11-18: https://github.com/DuarteSantos8/openGym/blob/main/NOTICE.md

## What the current notice says
openGym's application code uses AGPL-3.0. **Gym visual's exercise media are separate proprietary content.** The notice explicitly says that a *non-commercial fork of openGym* may keep the **unmodified 180px media together with the notice**. It also says not to hotlink/copy content out of the upstream repository or extract it from packages. Larger app-only files are **not** covered by the fork exception. The content may **not** be sent to AI models or used as image/video-generation reference.

Being free/no ads/no paid plan strongly supports non-commercial status, but it **does not by itself decide whether a separately branded expanded project counts as a permitted fork**, nor is it a sublicense from the original artist. Reintroducing files that were previously removed may differ from *keeping* them. Obtain written clarification from Gym visual or the original project maintainer before redistributing these files in openForm APKs to outside testers.

## Safe implementation now
- `frontend/src/lib/fork180-image-map.json` defaults to `{}`.
- `frontend/src/components/Media.jsx` prefers an explicitly staged fork still *only when present in the map*. Otherwise it uses RepDB. Private user photos still override both.
- `scripts/catalogue/stage-fork180.mjs` **never downloads** copyrighted files or extracts original APKs. It accepts only an externally provided, **lawfully retained fork media snapshot**, with `still/` and `NOTICE.md`, and requires `OPENFORM_FORK180_LICENSE_CONFIRMED=1`.
- Every WebP is copied byte-for-byte without modifications. Dimensions are validated to at most 180×180. The original NOTICE accompanies it.
- GitHub Actions invokes the gate with no source or consent by default, leaving the map empty and bundling the separately licensed RepDB illustrations. No permission claim is silently made for public beta distribution.
- No animations are staged at this point (only stills). An animation release requires separate performance and license review.

## For a *locally authorized* and explicitly non-commercial build

```bash
OPENFORM_FORK180_LICENSE_CONFIRMED=1 \
OPENFORM_FORK180_SOURCE=/absolute/path/to/lawfully-retained-openGym-media \
node scripts/catalogue/stage-fork180.mjs
cd frontend
VITE_MOBILE=1 npm run build
npx cap sync android
```

Do not run this on a source you copied out of an original APK or from an unauthorized mirror. Do not add proprietary media to a public Git commit merely to make CI work. GitHub Actions builds cannot automatically see local external source folders. Re-check NOTICE and obtain written licensing clarification before distribution.

## Work still pending
- Clarify fork and reintroduction rights with copyright holder, including distribution to friends/testers.
- If approved, securely stage from an authorized copy for a *separate opt-in, noncommercial artifact*, and verify the resulting APK media and NOTICE.
- If rights are not granted, keep RepDB and individually provided, licensed private exercise photos instead.
