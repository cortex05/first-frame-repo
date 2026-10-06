import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import useAuthStore, { selectIsAccountAdmin } from './store/useAuthStore';

import LandingScreen from './screens/landing/LandingScreen';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import Start from './screens/start/StartScreen';
import CreateCaseScreen from './screens/create-case/CreateCaseScreen';
import CaseScreen from './screens/case/CaseScreen';
import QuestionsScreen from './screens/questions/QuestionsScreen';
import MakePlaylistScreen from './screens/make-playlist/MakePlaylistScreen';
import RecommendedScreen from './screens/recommended/RecommendedScreen';
import CreateRecommendedScreen from './screens/create-recommended/CreateRecommendedScreen';
import EditRecommendedScreen from './screens/edit-recommended/EditRecommendedScreen';
import LoginScreen from './screens/auth/login/LoginScreen';
import RegisterScreen from './screens/auth/register/RegisterScreen';
import ChangePasswordScreen from './screens/auth/change-password/ChangePasswordScreen';
import AcceptTermsScreen from './screens/auth/accept-terms/AcceptTermsScreen';
import AccountScreen from './screens/account/AccountScreen';
import ArchiveScreen from './screens/archive/ArchiveScreen';
import ArchivedCaseScreen from './screens/archive/ArchivedCaseScreen';

// The guards only decide what the UI shows. Every rule they express is
// enforced again by the API, which is the actual authority.

const ProtectedRoutes = ({ isAuthenticated }) => {
	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
};

// A user with a temporary password can only reach the change-password page.
const PasswordChangeGate = ({ mustChangePassword }) => {
	if (mustChangePassword) {
		return <Navigate to="/change-password" replace />;
	}

	return <Outlet />;
};

// An account that has not accepted the current Terms of Service can only
// reach the accept-terms page (spec 008).
const TermsGate = ({ mustAcceptTerms }) => {
	if (mustAcceptTerms) {
		return <Navigate to="/accept-terms" replace />;
	}

	return <Outlet />;
};

// The accept-terms page itself, only while acceptance is pending.
const PendingTermsOnly = ({ mustAcceptTerms }) => {
	if (!mustAcceptTerms) {
		return <Navigate to="/dashboard" replace />;
	}

	return <Outlet />;
};

// Account administrators: managing the account and creating cases.
const AccountAdminRoutes = ({ isAccountAdmin }) => {
	if (!isAccountAdmin) {
		return <Navigate to="/dashboard" replace />;
	}

	return <Outlet />;
};

// PLATFORM administrators (isAdmin): the global Recommended sets.
const PlatformAdminRoutes = ({ isPlatformAdmin }) => {
	if (!isPlatformAdmin) {
		return <Navigate to="/dashboard" replace />;
	}

	return <Outlet />;
};

const PublicOnlyRoutes = ({ isAuthenticated }) => {
	if (isAuthenticated) {
		return <Navigate to="/dashboard" replace />;
	}

	return <Outlet />;
};

/**
 * The route tree, without a router, so tests can mount it inside a
 * MemoryRouter at any path.
 */
const AppRoutes = () => {
	const userInfo = useAuthStore((state) => state.userInfo);
	const isAccountAdmin = useAuthStore(selectIsAccountAdmin);

	const isAuthenticated = Boolean(userInfo?.token && userInfo?.userId && userInfo?.username);
	const isPlatformAdmin = Boolean(isAuthenticated && userInfo?.isAdmin);
	const mustChangePassword = Boolean(isAuthenticated && userInfo?.mustChangePassword);
	const mustAcceptTerms = Boolean(isAuthenticated && userInfo?.mustAcceptTerms);

	return (
		<Routes>
			<Route element={<PublicOnlyRoutes isAuthenticated={isAuthenticated} />}>
				<Route path="/" element={<LandingScreen />} />
				<Route path="/login" element={<LoginScreen />} />
				<Route path="/register" element={<RegisterScreen />} />
			</Route>

			<Route element={<ProtectedRoutes isAuthenticated={isAuthenticated} />}>
				<Route path="/change-password" element={<ChangePasswordScreen />} />

				<Route element={<PasswordChangeGate mustChangePassword={mustChangePassword} />}>
					<Route element={<PendingTermsOnly mustAcceptTerms={mustAcceptTerms} />}>
						<Route path="/accept-terms" element={<AcceptTermsScreen />} />
					</Route>

					<Route element={<TermsGate mustAcceptTerms={mustAcceptTerms} />}>
						<Route path="/dashboard" element={<DashboardScreen />} />
						<Route path="/start/:caseId" element={<Start />} />
						<Route path="/case/:id" element={<CaseScreen />} />
						<Route path="/make-playlist" element={<MakePlaylistScreen />} />
						<Route path="/questions/:caseId" element={<QuestionsScreen />} />
						<Route path="/archive" element={<ArchiveScreen />} />
						<Route path="/archive/:id" element={<ArchivedCaseScreen />} />

						<Route element={<AccountAdminRoutes isAccountAdmin={isAccountAdmin} />}>
							<Route path="/account" element={<AccountScreen />} />
							<Route path="/create-case" element={<CreateCaseScreen />} />
						</Route>

						<Route element={<PlatformAdminRoutes isPlatformAdmin={isPlatformAdmin} />}>
							<Route path="/recommended" element={<RecommendedScreen />} />
							<Route path="/create-recommended" element={<CreateRecommendedScreen />} />
							<Route path="/recommended/:charge" element={<EditRecommendedScreen />} />
						</Route>
					</Route>
				</Route>
			</Route>

			{/* Unknown paths: signed-in users go to the dashboard, everyone else to the landing page. */}
			<Route
				path="*"
				element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />}
			/>
		</Routes>
	);
};

export default AppRoutes;
