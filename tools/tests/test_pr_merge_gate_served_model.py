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


def review(model="gemini-3.8-flash-high", **changes):
    result = {
        "id": 5490784777,
        "state": "APPROVED",
        "commit_id": HEAD,
        "user": {"login": APP, "type": "Bot"},
        "body": f"Verdict: APPROVE\n\n_Rung: subscription — served by `{model}`; no per-token price._",
    }
    result.update(changes)
    return result


class ServedModelGateTests(unittest.TestCase):
    def run_gate(self, reviews=None, *, committer="ivangegovdve-sudo", ci="SUCCESS", draft=False):
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
                    "--approver", "caller-spoof", "--approvers", "ivan-codex-reviewer",
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
        for body in ["", "Reviewed by Gemini", "served by `future-lab/unmapped-model`"]:
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
