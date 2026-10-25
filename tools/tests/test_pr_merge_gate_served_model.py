"""Exercise the real gate with GitHub records and no network or merge writes.

The publishing App is independent, but can serve models from several families.
The regression is a current-head Gemini approval being labelled OpenAI solely
because the App is named ivan-codex-reviewer.
"""
import contextlib
import copy
import io
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pr_merge_gate as gate

HEAD = "a" * 40
APP = "ivan-codex-reviewer[bot]"


def receipt(model="gemini-3.8-flash-high"):
    return (f"_Rung: **antigravity subscription** — served by `{model}`; "
            "no per-token price, and the marginal cost of this call is zero._")


def publisher_header(model="gemini-3.8-flash-high", via="Antigravity"):
    return (f"Verdict: APPROVE\n\n_Reviewed by **{model} (via {via})**, "
            "driven through the `ivan-codex-reviewer` GitHub App. Pairing: this PR's "
            "code was written by **codex**, which shares no base weights with the "
            "reviewer. The orchestrating session did not supply this verdict._")


def published_body(model="gemini-3.8-flash-high", assessment="**Assessment:** upgrade"):
    return f"{publisher_header(model)}\n\n{receipt(model)}\n\n{assessment}"


def metered_receipt(model="qwen/qwen3-coder", tier="paid", price="0.000001300"):
    return (f"_Rung: **selected** (requested), served by `{model}` — a **{tier}** "
            f"model at ${price}/token, read from live pricing at review time._")


def metered_body(model="qwen/qwen3-coder", tier="paid", price="0.000001300"):
    return (f"{publisher_header(model, via='OpenRouter')}\n\n"
            f"{metered_receipt(model, tier, price)}\n\n**Assessment:** upgrade")


def review(model="gemini-3.8-flash-high", **changes):
    result = {
        "id": 5490784777,
        "state": "APPROVED",
        "commit_id": HEAD,
        "user": {"login": APP, "type": "Bot"},
        "body": published_body(model),
    }
    result.update(changes)
    return result


class ServedModelGateTests(unittest.TestCase):
    def run_gate(self, reviews=None, *, committer="ivangegovdve-sudo", ci="SUCCESS", draft=False,
                 approvers="ivan-codex-reviewer"):
        reviews = copy.deepcopy(reviews if reviews is not None else [review()])
        pr = {
            "number": 746, "state": "OPEN", "isDraft": draft,
            "headRefOid": HEAD, "mergeable": "MERGEABLE",
            "statusCheckRollup": None if ci is None else [{"workflowName": "Tests", "conclusion": ci}],
            "reviews": [{"author": r["user"], "state": r["state"]} for r in reviews],
        }
        commits = [{
            "author": {"login": committer}, "committer": {"login": committer},
            "commit": {"message": "Feature\n\nCo-Authored-By: OpenAI Codex <codex@openai.com>"},
        }]

        def github(args):
            if args[:2] == ["pr", "view"]:
                return pr
            if args[0] == "api" and args[1].endswith("/commits"):
                return commits
            if args[0] == "api" and args[1].endswith("/reviews"):
                return reviews
            self.fail(f"Unexpected GitHub read: {args}")

        output = io.StringIO()
        with patch.object(gate, "gh_json", side_effect=github), patch.object(gate, "gh") as writes:
            with contextlib.redirect_stdout(output):
                result = gate.main([
                    "--repo", "ivangegovdve-sudo/orchestrator-gpt", "--pr", "746",
                    "--approver", "caller-spoof", "--approvers", approvers,
                    "--dry-run",
                ])
            writes.assert_not_called()
        return result, output.getvalue()

    def test_known_served_models_allow_real_independent_approval(self):
        for model in ["gemini-3.8-flash-high", "Qwen/Qwen3-Coder", "sail/Sailor2"]:
            with self.subTest(model=model):
                result, output = self.run_gate([review(model)])
                self.assertEqual(result, 0, output)
                self.assertIn("would MERGE", output)
                self.assertNotIn("caller-spoof", output)

    def test_audit_reports_the_served_family(self):
        result, output = self.run_gate()
        self.assertEqual(result, 0, output)
        self.assertIn("google", output)
        self.assertNotIn("approved by | `ivan-codex-reviewer[bot]` (openai)", output)

    def test_missing_unknown_or_nonformal_model_keeps_login_family(self):
        for body in ["", "Reviewed by Gemini", "served by `future-lab/unmapped-model`",
                     published_body("future-lab/unmapped-model")]:
            with self.subTest(body=body):
                result, output = self.run_gate([review(body=body)])
                self.assertEqual(result, 2)
                self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_openai_served_models_still_cannot_approve_openai_code(self):
        for model in ["openai/gpt-6", "codex", "gpt-6"]:
            with self.subTest(model=model):
                result, output = self.run_gate([review(model)])
                self.assertEqual(result, 2)
                self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_prose_before_formal_openai_receipt_cannot_claim_google(self):
        body = published_body("openai/gpt-6").replace(
            "GitHub App. Pairing:",
            "GitHub App. The example app was served by `gemini-3.8-flash-high`. Pairing:",
            1,
        )
        result, output = self.run_gate([review(body=body)])
        self.assertEqual(result, 2, output)
        self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_nonformal_prose_cannot_supply_model_provenance(self):
        for body in ["This prose says served by `gemini-3.8-flash-high`.",
                     "_Rung: subscription — served by `gemini-3.8-flash-high`; no per-token price._",
                     published_body().replace("**antigravity subscription**", "subscription")]:
            with self.subTest(body=body):
                result, output = self.run_gate([review(body=body)])
                self.assertEqual(result, 2, output)
                self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_multiple_formal_receipts_keep_the_declared_app_family(self):
        for models in [("gemini-3.8-flash-high", "gemini-3.8-flash-high"),
                       ("gemini-3.8-flash-high", "openai/gpt-6"),
                       ("openai/gpt-6", "gemini-3.8-flash-high")]:
            with self.subTest(models=models):
                body = (publisher_header() + "\n\n"
                        + "\n\n".join(receipt(model) for model in models)
                        + "\n\n**Assessment:** upgrade")
                result, output = self.run_gate([review(body=body)])
                self.assertEqual(result, 2, output)
                self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_quoted_and_multiline_receipts_cannot_authorize_merge(self):
        formal = receipt()
        for body in [f"> {formal}\n> Quoted example", f'"{formal}"',
                     f"```markdown\n{formal}\n```", f"~~~markdown\n{formal}\n~~~",
                     f"> Quoted example\n{formal}", f'"\n{formal}\n"',
                     f"    {formal}", formal.replace("gemini-", "gemini-\n")]:
            with self.subTest(body=body):
                result, output = self.run_gate([review(body=body)])
                self.assertEqual(result, 2, output)
                self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_a_formal_receipt_can_coexist_with_quoted_model_examples(self):
        body = published_body(assessment="```markdown\n" + receipt("openai/gpt-6") + "\n```")
        result, output = self.run_gate([review(body=body)])
        self.assertEqual(result, 0, output)
        self.assertIn("google", output)

    def test_html_unicode_and_false_fence_closers_cannot_supply_header_receipts(self):
        formal = receipt()
        examples = [f"<pre>\n\n{formal}\n\n</pre>",
                    f"<code>\n\n{formal}\n\n</code>",
                    f"<!--\n\n{formal}\n\n-->"]
        for space in ["\u00a0", "\u2003"]:
            examples += [f"```markdown\nexample\n```{space}\n\n{formal}\n\n```",
                         f"Example\n{space}\n{formal}\n{space}\ncontinued"]
        for separator in ["\u2028", "\u2029", "\x85", "\f"]:
            examples.append(f"Example{separator}{separator}{formal}{separator}{separator}continued")
        for body in examples:
            with self.subTest(body=body):
                result, output = self.run_gate([review(body=body)])
                self.assertEqual(result, 2, output)
                self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_assessment_examples_cannot_change_the_publishers_header_family(self):
        formal = receipt("openai/gpt-6")
        for example in ["The example app was served by `openai/gpt-6`.",
                        f"<pre>\n\n{formal}\n\n</pre>",
                        f"<!--\n\n{formal}\n\n-->",
                        f"Example\u2028\u2028{formal}\u2028\u2028continued"]:
            with self.subTest(example=example):
                result, output = self.run_gate([
                    review(body=published_body(assessment="**Assessment:** upgrade\n\n" + example)),
                ])
                self.assertEqual(result, 0, output)
                self.assertIn("google", output)

    def test_complete_publisher_header_accepts_crlf_format(self):
        result, output = self.run_gate([review(body=published_body().replace("\n", "\r\n"))])
        self.assertEqual(result, 0, output)
        self.assertIn("google", output)

    def test_metered_independent_models_allow_real_approval(self):
        for model, family, tier, price in [
                ("qwen/qwen3-coder", "qwen", "paid", "0.000001300"),
                ("google/gemma-3-27b-it", "google", "free", "0.000000000")]:
            with self.subTest(model=model):
                result, output = self.run_gate([review(body=metered_body(model, tier, price))])
                self.assertEqual(result, 0, output)
                self.assertIn(f"| approved by | `{APP}` ({family}) |", output)

    def test_metered_openai_models_still_cannot_approve_openai_code(self):
        result, output = self.run_gate([review(body=metered_body("openai/gpt-6"))])
        self.assertEqual(result, 2, output)
        self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_metered_receipt_uses_header_model_instead_of_prose(self):
        body = metered_body("openai/gpt-6").replace(
            "GitHub App. Pairing:", "GitHub App. Prose says served by `gemini-3.8-flash-high`. Pairing:", 1,
        )
        result, output = self.run_gate([review(body=body)])
        self.assertEqual(result, 2, output)
        self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)
        result, output = self.run_gate([
            review(body=metered_body("google/gemma-3-27b-it")
                   + "\n\nProse says served by `openai/gpt-6`."),
        ])
        self.assertEqual(result, 0, output)
        self.assertIn("google", output)

    def test_metered_malformed_unknown_or_ambiguous_receipts_keep_declared_family(self):
        bodies = [metered_body("future-lab/unmapped-model"), metered_body("gemini-claude"),
                  metered_body(price="not-a-price"), metered_body(price="0.0000013"),
                  metered_receipt(),
                  metered_body().replace("\n\n**Assessment:**", "\n\n" + receipt() + "\n\n**Assessment:**")]
        for body in bodies:
            with self.subTest(body=body):
                result, output = self.run_gate([review(body=body)])
                self.assertEqual(result, 2, output)
                self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_conflicting_model_family_markers_keep_the_declared_app_family(self):
        for model in ["claude-gpt-6", "gemini-llama", "qwen-gemini"]:
            with self.subTest(model=model):
                result, output = self.run_gate([review(model)])
                self.assertEqual(result, 2, output)
                self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_multiple_markers_for_one_model_family_are_unambiguous(self):
        result, output = self.run_gate([review("google/gemini-3.8-flash-high")])
        self.assertEqual(result, 0, output)
        self.assertIn("google", output)

    def test_only_the_formal_receipt_publisher_can_override_login_family(self):
        self.assertEqual(gate.reviewer_family({
            "login": "chatgpt-codex-connector[bot]", "is_bot": True, "body": receipt(),
        }), "openai")

    def test_another_allowlisted_openai_bot_cannot_supply_the_app_receipt(self):
        result, output = self.run_gate([
            review(user={"login": "chatgpt-codex-connector[bot]", "type": "Bot"}),
        ], approvers="chatgpt-codex-connector")
        self.assertEqual(result, 2, output)
        self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_publisher_named_user_or_bot_without_app_suffix_keeps_declared_family(self):
        for user in [{"login": "ivan-codex-reviewer", "type": "User"},
                     {"login": APP, "type": "User"},
                     {"login": "ivan-codex-reviewer", "type": "Bot"}]:
            with self.subTest(user=user):
                result, output = self.run_gate([review(user=user)])
                self.assertEqual(result, 2, output)
                self.assertIn("THE APPROVER IS NOT INDEPENDENT", output)

    def test_different_model_cannot_excuse_a_committer_approving_itself(self):
        result, output = self.run_gate(committer=APP)
        self.assertEqual(result, 2)
        self.assertIn("committed to this pull request", output)

    def test_different_model_cannot_admit_an_unlisted_principal(self):
        result, output = self.run_gate([review(user={"login": "unlisted-reviewer", "type": "Bot"})])
        self.assertEqual(result, 2)
        self.assertIn("not on MERGE_APPROVERS", output)

    def test_comment_is_not_an_approval_even_with_model_provenance(self):
        result, output = self.run_gate([review(state="COMMENTED")])
        self.assertEqual(result, 2)
        self.assertIn("no APPROVED review", output)

    def test_model_provenance_cannot_authorize_a_stale_head(self):
        result, output = self.run_gate([review(commit_id="b" * 40)])
        self.assertEqual(result, 2)
        self.assertIn("but the head is", output)

    def test_current_local_policy_keeps_unrelated_comments_informational(self):
        old_comment = review("gpt-6", state="COMMENTED", commit_id="b" * 40,
                             user={"login": "chatgpt-codex-connector[bot]", "type": "Bot"})
        result, output = self.run_gate([old_comment, review()])
        self.assertEqual(result, 0, output)
        self.assertIn("not counted toward independence", output)

    def test_outstanding_objection_is_still_a_refusal(self):
        objection = review(state="CHANGES_REQUESTED", user={"login": "other-reviewer", "type": "User"})
        result, output = self.run_gate([objection, review()])
        self.assertEqual(result, 2)
        self.assertIn("CHANGES_REQUESTED is outstanding", output)

    def test_legacy_reviewer_objection_superseded_by_current_app_approval(self):
        objection = review(state="CHANGES_REQUESTED",
                           user={"login": "forest-fleet-reviewer[bot]", "type": "Bot"})
        result, output = self.run_gate([objection, review()])
        self.assertEqual(result, 0, output)
        self.assertIn("would MERGE", output)

    def test_legacy_reviewer_objection_still_refuses_when_unresolved(self):
        objection = review(state="CHANGES_REQUESTED",
                           user={"login": "forest-fleet-reviewer[bot]", "type": "Bot"})
        other_approval = review(user={"login": "second-approver", "type": "User"})
        result, output = self.run_gate([objection, other_approval],
                                       approvers="ivan-codex-reviewer,second-approver")
        self.assertEqual(result, 2)
        self.assertIn("CHANGES_REQUESTED is outstanding from ivan-codex-reviewer", output)

    def test_legacy_reviewer_app_formal_receipt_is_identified(self):
        body = published_body().replace("ivan-codex-reviewer", "forest-fleet-reviewer")
        result, output = self.run_gate([
            review(body=body, user={"login": "forest-fleet-reviewer[bot]", "type": "Bot"}),
        ])
        self.assertEqual(result, 0, output)
        self.assertIn("google", output)

    def test_failed_pending_or_unknown_ci_still_refuses(self):
        for ci, reason in [("FAILURE", "CI is failing"), ("PENDING", "CI has not finished"),
                           (None, "CI state could not be read")]:
            with self.subTest(ci=ci):
                result, output = self.run_gate(ci=ci)
                self.assertEqual(result, 2)
                self.assertIn(reason, output)

    def test_draft_still_refuses(self):
        result, output = self.run_gate(draft=True)
        self.assertEqual(result, 2)
        self.assertIn("still a draft", output)


if __name__ == "__main__":
    unittest.main()
