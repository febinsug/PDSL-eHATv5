import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { HourSubmission } from './pages/HourSubmission';
import { Overview } from './pages/Overview';
import { Projects } from './pages/Projects';
import { Approvals } from './pages/Approvals';
import { People } from './pages/People';
import { Settings } from './pages/Settings';
import { Team } from './pages/Team';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'react-hot-toast';

function App() {
  const { hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/eHAT" element={<Login />} />
          <Route path="/" element={
            <Layout>
              <Overview />
            </Layout>
          } />
          <Route path="/hours" element={
            <Layout>
              <HourSubmission />
            </Layout>
          } />
          <Route path="/projects" element={
            <Layout>
              <Projects />
            </Layout>
          } />
          <Route path="/approvals" element={
            <Layout>
              <Approvals />
            </Layout>
          } />
          <Route path="/team" element={
            <Layout>
              <Team />
            </Layout>
          } />
          <Route path="/people" element={
            <Layout>
              <People />
            </Layout>
          } />
          <Route path="/settings" element={
            <Layout>
              <Settings />
            </Layout>
          } />
          {/* Catch all route - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;