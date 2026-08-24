import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import './App.css'

import useCaseStore from './store/useCaseStore';
import useAuthStore from './store/useAuthStore';
import { upgradeLegacyCases } from './utils/caseNormalization';

import Home from './screens/home/HomeScreen';
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

const ProtectedRoutes = ({ isAuthenticated }) => {
	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
};

const AdminRoutes = ({ isAdmin }) => {
	if (!isAdmin) {
		return <Navigate to="/home" replace />;
	}

	return <Outlet />;
};

const PublicOnlyRoutes = ({ isAuthenticated }) => {
	if (isAuthenticated) {
		return <Navigate to="/home" replace />;
	}

	return <Outlet />;
};

function App() {
	const getAllCases = useCaseStore((state) => state.getAllCases);
	const userInfo = useAuthStore((state) => state.userInfo);
	const playlists = useAuthStore((state) => state.playlists);
	const fetchUserPlaylists = useAuthStore((state) => state.fetchUserPlaylists);
	const recommendedNames = useAuthStore((state) => state.recommendedNames);
	const fetchRecommendedNames = useAuthStore((state) => state.fetchRecommendedNames);

	const isAuthenticated = Boolean(userInfo?.token && userInfo?.userId && userInfo?.username);
	const isAdmin = Boolean(isAuthenticated && userInfo?.isAdmin);

	useEffect(() => {
		const storedCases = localStorage.getItem('cases') || [];
		if(storedCases.length > 0) {
			// Cases saved before classification became a single `category` id
			// still hold the old caseType/charge pair.
			const upgradedCases = upgradeLegacyCases(JSON.parse(storedCases));
			localStorage.setItem('cases', JSON.stringify(upgradedCases));
			getAllCases(upgradedCases);
		} else {
			localStorage.setItem('cases', JSON.stringify([]));
			getAllCases([]);
		}
	}, []);

	useEffect(() => {
		if (userInfo?.token && playlists.length === 0) {
			fetchUserPlaylists(userInfo.token);
		}
	}, []);

	// Rehydrate after a page reload -- login populates these, but a refresh
	// restores userInfo from localStorage without going through login.
	useEffect(() => {
		if (isAdmin && recommendedNames.length === 0) {
			fetchRecommendedNames(userInfo.token);
		}
	}, [isAdmin]);

  	return (
    	<BrowserRouter>
      		<Routes>
				<Route
					path="/"
					element={<Navigate to={isAuthenticated ? '/home' : '/login'} replace />}
				/>

				<Route element={<PublicOnlyRoutes isAuthenticated={isAuthenticated} />}>
					<Route path="/login" element={<LoginScreen />} />
					<Route path="/register" element={<RegisterScreen />} />
				</Route>

				<Route element={<ProtectedRoutes isAuthenticated={isAuthenticated} />}>
					<Route path="/home" element={<Home />} />
					<Route path="/start/:caseId" element={<Start />} />
					<Route path="/create-case" element={<CreateCaseScreen />} />
					<Route path="/case/:id" element={<CaseScreen />} />
					<Route path="/make-playlist" element={<MakePlaylistScreen />} />
					<Route path="/questions/:caseId" element={<QuestionsScreen />} />

					<Route element={<AdminRoutes isAdmin={isAdmin} />}>
						<Route path="/recommended" element={<RecommendedScreen />} />
						<Route path="/create-recommended" element={<CreateRecommendedScreen />} />
						<Route path="/recommended/:charge" element={<EditRecommendedScreen />} />
					</Route>
				</Route>
      		</Routes>
    	</BrowserRouter>
  	);
}

export default App
