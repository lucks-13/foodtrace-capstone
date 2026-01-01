import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';


function App() {
  const [batchId, setBatchId] = useState('');
  const [batchData, setBatchData] = useState('');
  const [traces, setTraces] = useState([]);
  const [status, setStatus] = useState('');


  // 🔥 Food Safety States
  const [districts, setDistricts] = useState([]);
  const [safetyData, setSafetyData] = useState(null);
  const [topRisky, setTopRisky] = useState([]);
  const [loading, setLoading] = useState(true);


  // 🔥 Load safety data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [districtsRes, statsRes] = await Promise.all([
          axios.get('http://localhost:8001/districts'),
          axios.get('http://localhost:8001/stats')
        ]);


        setDistricts(districtsRes.data.districts || []);
        setTopRisky(statsRes.data.districts || []);
        setStatus('✅ Safety data loaded!');
      } catch (error) {
        setStatus(`❌ Safety data failed: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);


  // 🔗 Add batch to blockchain
  const addBatch = async () => {
    try {
      const response = await axios.post('http://localhost:8001/add-batch', {
        batch_id: batchId,
        data: batchData
      });


      setStatus(`✅ TX: ${response.data.tx_hash.slice(0, 10)}...`);
      setTraces([response.data, ...traces]);
      setBatchId('');
      setBatchData('');
    } catch (error) {
      setStatus(`❌ ${error.response?.data?.detail || error.message}`);
    }
  };


  // 🛡️ Check food safety
  const checkSafety = async (district) => {
    try {
      const res = await axios.get(`http://localhost:8001/safety/${district}`);
      setSafetyData(res.data);
      setStatus(`✅ ${district} safety loaded`);
    } catch (error) {
      setStatus(`❌ ${error.response?.data?.detail || error.message}`);
    }
  };


  // 🔍 Trace batch
  const traceBatch = async (district) => {
    try {
      const batch = `${district}-B001`;
      const res = await axios.get(`http://localhost:8001/trace/${batch}`);
      setStatus(`✅ TRACE FOUND: ${res.data.data.slice(0, 50)}...`);
      console.log('✅ FULL TRACE:', res.data);
    } catch (error) {
      console.error('TRACE ERROR:', error.response?.data || error.message);
      setStatus(`❌ ${district}-B001 not found - Check console`);
    }
  };


  return (
    <div className="App" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#4CAF50' }}>🍎 FoodTrace Safety Dashboard</h1>
      <p>Blockchain Supply Chain + Food Safety Analysis</p>


      {/* ✅ Dynamic STATUS BAR */}
      <div style={{ 
        background: status.includes('✅') ? '#d4edda' : status.includes('❌') ? '#f8d7da' : '#fff3cd', 
        color: status.includes('✅') ? '#155724' : status.includes('❌') ? '#721c24' : '#856404',
        padding: 12, 
        borderRadius: 8, 
        marginBottom: 20,
        borderLeft: `4px solid ${status.includes('✅') ? '#28a745' : status.includes('❌') ? '#dc3545' : '#ffc107'}`
      }}>
        <strong>Status:</strong> {status} | 
        Districts: {districts.length} | 
        Top Risky: {topRisky.length} | 
        Loading: {loading ? '⏳' : '✅'}
      </div>


      {/* 🛡️ SAFETY DASHBOARD */}
      <div style={{ background: '#e8f5e8', padding: '20px', borderRadius: '10px' }}>
        <h2 style={{ color: '#2E7D32' }}>🛡️ Food Safety Analysis</h2>


        {loading ? (
          <p>⏳ Loading districts...</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginTop: '20px'
            }}
          >
            {topRisky.map((district, idx) => {
              const districtName = (district.district || district.name || 'NO NAME').toUpperCase();


              return (
                <div
                  key={districtName + idx}
                  onClick={() => checkSafety(districtName)}
                  style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    borderLeft: '6px solid #f44336',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>
                    {districtName}
                  </div>


                  <div style={{ fontSize: '28px', color: '#d32f2f', marginBottom: '6px' }}>
                    {district.total_area?.toLocaleString() ?? '0'} ha
                  </div>


                  <span
                    style={{
                      background: '#ffebee',
                      color: '#c62828',
                      padding: '6px 12px',
                      borderRadius: '14px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    {district.risk || 'UNKNOWN'}
                  </span>


                  <div
                    style={{
                      fontSize: '12px',
                      marginTop: '8px',
                      color: district.priority ? '#d32f2f' : '#4caf50'
                    }}
                  >
                    {district.priority ? '🚨 PRIORITY' : '✅ OK'}
                  </div>
                </div>
              );
            })}
          </div>
        )}


        {/* DISTRICT SELECT */}
        <select
          onChange={(e) => e.target.value && checkSafety(e.target.value)}
          style={{
            padding: '12px',
            marginTop: '20px',
            width: '300px',
            borderRadius: '8px'
          }}
        >
          <option>Select District</option>
          {districts.slice(0, 20).map((d, i) => (
            <option key={i}>{d}</option>
          ))}
        </select>


        {/* SAFETY REPORT */}
        {safetyData && (
          <div
            style={{
              marginTop: '25px',
              background: '#f1f8e9',
              padding: '25px',
              borderRadius: '12px',
              borderLeft: '6px solid #689f38'
            }}
          >
            <h3>
              📊 {safetyData.district || safetyData.district_name || 'NO NAME'} Safety Report
            </h3>


            <p><strong>Total Area:</strong> {safetyData.total_area_ha?.toLocaleString()} ha</p>
            <p><strong>Risk Level:</strong> {safetyData.risk_level}</p>
            <p><strong>Records:</strong> {safetyData.records_count}</p>


            {/* 🔍 TRACE BUTTON */}
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button
                onClick={() => traceBatch(safetyData.district || safetyData.district_name || 'UNKNOWN')}
                style={{
                  padding: '14px 30px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                🔍 Trace {(safetyData.district || safetyData.district_name || 'UNKNOWN')}-B001
              </button>
            </div>
          </div>
        )}
      </div>


      {/* 🔗 BLOCKCHAIN SECTION */}
      <div
        style={{
          background: '#f5f5f5',
          padding: '20px',
          borderRadius: '10px',
          marginTop: '30px'
        }}
      >
        <h2>🔗 Blockchain Traceability</h2>


        <input
          placeholder="Batch ID (ARIYALUR-B001)"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          style={{ padding: '12px', width: '220px', marginRight: '10px' }}
        />


        <input
          placeholder='{"crop":"Rice","harvest":"2025-12-28"}'
          value={batchData}
          onChange={(e) => setBatchData(e.target.value)}
          style={{ padding: '12px', width: '400px', marginRight: '10px' }}
        />


        <button
          onClick={addBatch}
          style={{
            padding: '14px 28px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          🚀 Add to Blockchain
        </button>
      </div>


      {/* 📋 BATCH LIST */}
      <h2 style={{ marginTop: '30px' }}>📋 Blockchain Batches</h2>
      {traces.map((trace, i) => (
        <div
          key={i}
          style={{
            border: '1px solid #ddd',
            padding: '15px',
            borderRadius: '10px',
            marginTop: '10px'
          }}
        >
          <strong>{trace.batch_id}</strong>
          <p>{trace.data}</p>


          {/* ✅ GREEN TX HASH CARD */}
          <div style={{
            fontSize: 14,
            color: '#155724',
            background: '#d4edda',
            padding: '12px 16px',
            borderRadius: 12,
            borderLeft: '4px solid #28a745',
            marginTop: 12,
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ marginRight: 12, fontSize: 16 }}>✅ TX CONFIRMED:</span>
            <code style={{ 
              background: '#28a745', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: 20,
              fontFamily: 'monospace',
              fontWeight: 'bold'
            }}>
              {trace.tx_hash?.slice(0, 20)}...
            </code>
          </div>
        </div>
      ))}
    </div>
  );
}


export default App;