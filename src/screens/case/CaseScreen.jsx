import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useCaseStore from '../../store/useCaseStore';

const CaseScreen = () => {
	const [loading, setLoading] = useState(true);
	const { id } = useParams();
	const setActiveCase = useCaseStore((state) => state.setActiveCase);

  	useEffect(() => {
    	setActiveCase(id);
    	setLoading(false);
  	}, []);

  	return (
    	<div>
			{loading ? (
				<p>Loading case...</p>
			) : (
				<h1>Case Screen</h1>
			)}
		</div>
  	)
}

export default CaseScreen