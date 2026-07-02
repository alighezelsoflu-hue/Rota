#!/usr/bin/env python3
"""
Reorganize Rota frontend/src into a professional feature-based structure.
Run from the repo root (/Users/ali/Downloads/rota-mvp) or from the frontend folder.

What it does:
- Moves src files into app/, api/, components/, features/, styles/
- Updates relative import paths automatically
- Keeps every existing feature working by preserving filenames and default exports
- Adds/updates frontend/.gitignore to keep node_modules/dist out of Git
"""
from __future__ import annotations

import os
import re
import shutil
from pathlib import Path

cwd = Path.cwd().resolve()
if (cwd / "frontend" / "src").exists():
    frontend = cwd / "frontend"
elif (cwd / "src").exists():
    frontend = cwd
else:
    raise SystemExit("Could not find frontend/src. Run this from the repo root or the frontend folder.")

src = frontend / "src"

MAPPING: dict[str, str] = {
    # app shell
    "App.tsx": "app/App.tsx",

    # global styles and shared UI
    "styles.css": "styles/global.css",
    "ui.tsx": "components/ui/ui.tsx",

    # brand and layout components
    "RotaLogo.tsx": "components/brand/RotaLogo.tsx",
    "LoadingScreen.tsx": "components/brand/LoadingScreen.tsx",
    "NetworkBackground.tsx": "components/layout/NetworkBackground.tsx",
    "ThemeToggle.tsx": "components/layout/ThemeToggle.tsx",
    "GuestMobileAuthBar.tsx": "components/layout/GuestMobileAuthBar.tsx",
    "MobileBottomNav.tsx": "components/layout/MobileBottomNav.tsx",
    "ProfileMenu.tsx": "components/layout/ProfileMenu.tsx",
    "NotificationsBell.tsx": "components/layout/NotificationsBell.tsx",
    "ProfileAvatar.tsx": "components/user/ProfileAvatar.tsx",

    # API clients
    "api.ts": "api/api.ts",
    "platformApi.ts": "api/platformApi.ts",
    "groupOperationsApi.ts": "api/groupOperationsApi.ts",
    "exportsDisputesApi.ts": "api/exportsDisputesApi.ts",
    "communityGrowthApi.tsx": "api/communityGrowthApi.ts",
    "adminSafetyApi.ts": "api/adminSafetyApi.ts",
    "memberAdmissionApi.ts": "api/memberAdmissionApi.ts",
    "profilePictureApi.ts": "api/profilePictureApi.ts",
    "messageReadApi.ts": "api/messageReadApi.ts",

    # top-level features / pages
    "ActionCenterPage.tsx": "features/actions/ActionCenterPage.tsx",
    "AdminSafetyDashboard.tsx": "features/admin/AdminSafetyDashboard.tsx",
    "InviteCodeJoinCard.tsx": "features/dashboard/InviteCodeJoinCard.tsx",
    "TodayPreview.tsx": "features/dashboard/TodayPreview.tsx",
    "DiscoverPage.tsx": "features/discovery/DiscoverPage.tsx",
    "PublicInvitePage.tsx": "features/discovery/PublicInvitePage.tsx",
    "MessagesPage.tsx": "features/messages/MessagesPage.tsx",
    "OnboardingPage.tsx": "features/onboarding/OnboardingPage.tsx",
    "SettingsPage.tsx": "features/settings/SettingsPage.tsx",
    "TrustNetworkDashboard.tsx": "features/trust/TrustNetworkDashboard.tsx",
    "TrustPassportPage.tsx": "features/trust/TrustPassportPage.tsx",
    "ReviewsPage.tsx": "features/reviews/ReviewsPage.tsx",

    # marketing / landing
    "ProductPrinciples.tsx": "features/marketing/ProductPrinciples.tsx",
    "HeroCycleDemo.tsx": "features/marketing/HeroCycleDemo.tsx",
    "HomeHero.tsx": "features/marketing/HomeHero.tsx",
    "CircleExampleCard.tsx": "features/marketing/CircleExampleCard.tsx",

    # simulator
    "LiveCircleSimulator.tsx": "features/simulator/LiveCircleSimulator.tsx",
    "CircleCalculator.tsx": "features/simulator/CircleCalculator.tsx",
    "simulator/CashflowTable.tsx": "features/simulator/components/CashflowTable.tsx",
    "simulator/NetPositionChart.tsx": "features/simulator/components/NetPositionChart.tsx",
    "simulator/PayoutTimeline.tsx": "features/simulator/components/PayoutTimeline.tsx",
    "simulator/SimulatorSummary.tsx": "features/simulator/components/SimulatorSummary.tsx",
    "simulator/simulatorMath.ts": "features/simulator/simulatorMath.ts",

    # group workspace shell and tabs
    "CompactGroupHeader.tsx": "features/groups/workspace/CompactGroupHeader.tsx",
    "GroupWorkspaceTabs.tsx": "features/groups/workspace/GroupWorkspaceTabs.tsx",
    "GroupOverviewTab.tsx": "features/groups/workspace/GroupOverviewTab.tsx",
    "GroupPaymentsTab.tsx": "features/groups/workspace/GroupPaymentsTab.tsx",
    "GroupMembersTab.tsx": "features/groups/workspace/GroupMembersTab.tsx",
    "GroupMessagesTab.tsx": "features/groups/workspace/GroupMessagesTab.tsx",
    "GroupReviewsTab.tsx": "features/groups/workspace/GroupReviewsTab.tsx",
    "GroupManageTab.tsx": "features/groups/workspace/GroupManageTab.tsx",
    "GroupTodayCard.tsx": "features/groups/workspace/GroupTodayCard.tsx",
    "GroupHealthPanel.tsx": "features/groups/workspace/GroupHealthPanel.tsx",

    # group sub-features
    "GroupChatPanel.tsx": "features/groups/chat/GroupChatPanel.tsx",
    "GroupGovernancePanel.tsx": "features/groups/governance/GroupGovernancePanel.tsx",

    # payments, disputes, exports, late payments
    "GroupExportActions.tsx": "features/groups/payments/GroupExportActions.tsx",
    "ReceiptReviewActions.tsx": "features/groups/payments/ReceiptReviewActions.tsx",
    "StructuredDisputeActions.tsx": "features/groups/payments/StructuredDisputeActions.tsx",
    "DisputeCasePanel.tsx": "features/groups/payments/DisputeCasePanel.tsx",
    "LatePaymentPanel.tsx": "features/groups/payments/LatePaymentPanel.tsx",

    # group operations and admissions
    "GroupCommandCenter.tsx": "features/groups/operations/GroupCommandCenter.tsx",
    "GroupRulesPage.tsx": "features/groups/operations/GroupRulesPage.tsx",
    "MemberResponsibilityTracker.tsx": "features/groups/operations/MemberResponsibilityTracker.tsx",
    "PaymentScheduleCalendar.tsx": "features/groups/operations/PaymentScheduleCalendar.tsx",
    "GroupAnnouncementsPanel.tsx": "features/groups/operations/GroupAnnouncementsPanel.tsx",
    "GroupInviteControls.tsx": "features/groups/operations/GroupInviteControls.tsx",
    "GroupSettingsPanel.tsx": "features/groups/operations/GroupSettingsPanel.tsx",
    "GroupShareInvite.tsx": "features/groups/operations/GroupShareInvite.tsx",
    "MemberAdmissionPanel.tsx": "features/groups/operations/MemberAdmissionPanel.tsx",

    # group reviews
    "MemberReviewPanel.tsx": "features/groups/reviews/MemberReviewPanel.tsx",
    "CycleReviewPrompt.tsx": "features/groups/reviews/CycleReviewPrompt.tsx",
}

OLD_TO_NEW = {src / old: src / new for old, new in MAPPING.items()}
EXTS = [".tsx", ".ts", ".jsx", ".js", ".css"]


def resolve_import(old_file: Path, spec: str) -> Path | None:
    base = (old_file.parent / spec).resolve()
    candidates: list[Path] = []

    if base.suffix:
        candidates.append(base)
    else:
        candidates.extend(Path(str(base) + ext) for ext in EXTS)
        candidates.extend(base / ("index" + ext) for ext in EXTS)

    for candidate in candidates:
        if candidate.exists() or candidate in OLD_TO_NEW:
            return candidate

    return None


def relative_specifier(new_file: Path, new_target: Path) -> str:
    rel = os.path.relpath(new_target, start=new_file.parent).replace(os.sep, "/")
    if not rel.startswith("."):
        rel = "./" + rel

    # Keep .css extension. Strip TS/JS extensions like normal TS imports.
    if new_target.suffix in {".ts", ".tsx", ".js", ".jsx"}:
        rel = rel[: -len(new_target.suffix)]

    return rel


def update_imports_before_move() -> None:
    ts_files = [p for p in src.rglob("*") if p.is_file() and p.suffix in {".ts", ".tsx"}]

    def replace_for_file(old_file: Path, text: str) -> str:
        new_file = OLD_TO_NEW.get(old_file, old_file)

        def repl(match: re.Match[str]) -> str:
            prefix, spec, suffix = match.group(1), match.group(2), match.group(3)
            if not spec.startswith("."):
                return match.group(0)

            target = resolve_import(old_file, spec)
            if not target:
                return match.group(0)

            new_target = OLD_TO_NEW.get(target, target)
            return prefix + relative_specifier(new_file, new_target) + suffix

        # Static imports/exports: import ... from './x', export ... from './x', import './x'
        text = re.sub(
            r"((?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"])(\.[^'\"]+)(['\"])",
            repl,
            text,
        )

        # Dynamic imports: import('./x')
        text = re.sub(
            r"(import\(\s*['\"])(\.[^'\"]+)(['\"]\s*\))",
            repl,
            text,
        )

        return text

    for old_file in ts_files:
        original = old_file.read_text(encoding="utf-8")
        updated = replace_for_file(old_file, original)
        if updated != original:
            old_file.write_text(updated, encoding="utf-8")


def move_files() -> None:
    for old, new in sorted(OLD_TO_NEW.items(), key=lambda item: len(item[0].parts), reverse=True):
        if not old.exists():
            continue
        if new.exists():
            print(f"SKIP existing target: {new.relative_to(frontend)}")
            continue
        new.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(old), str(new))
        print(f"MOVED {old.relative_to(frontend)} -> {new.relative_to(frontend)}")


def remove_empty_dirs() -> None:
    for directory in sorted((p for p in src.rglob("*") if p.is_dir()), reverse=True):
        try:
            directory.rmdir()
        except OSError:
            pass


def write_gitignore() -> None:
    gitignore = frontend / ".gitignore"
    required = [
        "node_modules/",
        "dist/",
        ".vite-temp/",
        ".env.local",
        ".DS_Store",
        "__MACOSX/",
    ]
    existing = gitignore.read_text(encoding="utf-8") if gitignore.exists() else ""
    lines = existing.splitlines()
    changed = False

    for item in required:
        if item not in lines:
            lines.append(item)
            changed = True

    if changed:
        gitignore.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")
        print(f"UPDATED {gitignore.relative_to(frontend)}")


def validate_relative_imports() -> None:
    missing: list[tuple[str, str]] = []
    pattern = re.compile(r"(?:from\s+|import\(\s*)['\"](\.[^'\"]+)['\"]")

    for file in src.rglob("*"):
        if not file.is_file() or file.suffix not in {".ts", ".tsx"}:
            continue
        text = file.read_text(encoding="utf-8")
        for match in pattern.finditer(text):
            spec = match.group(1)
            base = file.parent / spec
            if base.suffix:
                ok = base.exists()
            else:
                ok = any(Path(str(base) + ext).exists() for ext in EXTS) or any((base / ("index" + ext)).exists() for ext in EXTS)
            if not ok:
                missing.append((file.relative_to(src).as_posix(), spec))

    if missing:
        print("\nMissing relative imports found:")
        for file, spec in missing:
            print(f"  {file}: {spec}")
        raise SystemExit("Fix missing imports before building.")

    print("Relative import check passed.")


def main() -> None:
    if (src / "app" / "App.tsx").exists() and not (src / "App.tsx").exists():
        print("src already looks reorganized. Checking imports only.")
        validate_relative_imports()
        write_gitignore()
        return

    print(f"Reorganizing {src}")
    update_imports_before_move()
    move_files()
    remove_empty_dirs()
    write_gitignore()
    validate_relative_imports()
    print("\nDone. Now run:")
    print("  cd frontend")
    print("  npm run build")


if __name__ == "__main__":
    main()
