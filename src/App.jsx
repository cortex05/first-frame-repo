import React, { useEffect } from 'react'
import { BrowserRouter } from "react-router-dom";

import useCaseStore from './store/useCaseStore';
import useAuthStore from './store/useAuthStore';
import { upgradeLegacyCases } from './utils/caseNormalization';
import AppRoutes from './AppRoutes';

function App() {
	const getAllCases = useCaseStore((state) => state.getAllCases);
	const userInfo = useAuthStore((state) => state.userInfo);
	const playlists = useAuthStore((state) => state.playlists);
	const fetchUserPlaylists = useAuthStore((state) => state.fetchUserPlaylists);
	const recommendedNames = useAuthStore((state) => state.recommendedNames);
	const fetchRecommendedNames = useAuthStore((state) => state.fetchRecommendedNames);

	const isAuthenticated = Boolean(userInfo?.token && userInfo?.userId && userInfo?.username);
	const isPlatformAdmin = Boolean(isAuthenticated && userInfo?.isAdmin);
	// A user with a temporary password gets 403 from everything but the
	// password change, so there is nothing to rehydrate for them yet.
	const canLoadData = isAuthenticated && !userInfo?.mustChangePassword;

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
		if (canLoadData && playlists.length === 0) {
			fetchUserPlaylists(userInfo.token);
		}
	}, []);

	// Rehydrate after a page reload -- login populates these, but a refresh
	// restores userInfo from localStorage without going through login.
	useEffect(() => {
		if (canLoadData && isPlatformAdmin && recommendedNames.length === 0) {
			fetchRecommendedNames(userInfo.token);
		}
	}, [isPlatformAdmin]);

  	return (
    	<BrowserRouter>
			<AppRoutes />
    	</BrowserRouter>
  	);
}

export default App
