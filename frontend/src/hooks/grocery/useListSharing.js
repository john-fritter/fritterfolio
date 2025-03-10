import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';

export const useListSharing = (user) => {
  const [pendingShares, setPendingShares] = useState([]);
  const [acceptedShares, setAcceptedShares] = useState([]);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharingError, setSharingError] = useState(null);

  // Fetch pending shares
  const fetchPendingShares = useCallback(async () => {
    if (!user) return;
    
    try {
      setSharingLoading(true);
      setSharingError(null);
      const shares = await api.getPendingSharedLists();
      setPendingShares(shares);
    } catch (error) {
      console.error("Error fetching pending shares:", error);
      setSharingError("Failed to load pending shares");
    } finally {
      setSharingLoading(false);
    }
  }, [user]);

  // Fetch accepted shares
  const fetchAcceptedShares = useCallback(async () => {
    if (!user) return;
    
    try {
      setSharingLoading(true);
      setSharingError(null);
      const shares = await api.getAcceptedSharedLists();
      setAcceptedShares(shares);
    } catch (error) {
      console.error("Error fetching accepted shares:", error);
      setSharingError("Failed to load shared lists");
    } finally {
      setSharingLoading(false);
    }
  }, [user]);

  // Share a list with another user
  const shareList = async (listId, email) => {
    try {
      setSharingLoading(true);
      setSharingError(null);
      await api.shareList(listId, email);
      return true;
    } catch (error) {
      console.error("Error sharing list:", error);
      setSharingError(error.message || "Failed to share list");
      return false;
    } finally {
      setSharingLoading(false);
    }
  };

  // Accept a shared list
  const acceptShare = async (shareId) => {
    try {
      setSharingLoading(true);
      setSharingError(null);
      await api.respondToSharedList(shareId, 'accepted');
      await fetchPendingShares();
      await fetchAcceptedShares();
      return true;
    } catch (error) {
      console.error("Error accepting share:", error);
      setSharingError("Failed to accept shared list");
      return false;
    } finally {
      setSharingLoading(false);
    }
  };

  // Reject a shared list
  const rejectShare = async (shareId) => {
    try {
      setSharingLoading(true);
      setSharingError(null);
      await api.respondToSharedList(shareId, 'rejected');
      await fetchPendingShares();
      return true;
    } catch (error) {
      console.error("Error rejecting share:", error);
      setSharingError("Failed to reject shared list");
      return false;
    } finally {
      setSharingLoading(false);
    }
  };

  // Initialize - fetch shares if user is authenticated
  useEffect(() => {
    if (user) {
      fetchPendingShares();
      fetchAcceptedShares();
    }
  }, [user, fetchPendingShares, fetchAcceptedShares]);

  return {
    pendingShares,
    acceptedShares,
    sharingLoading,
    sharingError,
    shareList,
    acceptShare,
    rejectShare,
    fetchPendingShares,
    fetchAcceptedShares
  };
}; 