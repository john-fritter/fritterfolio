import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';

export const useListSharing = (user) => {
  const [pendingShares, setPendingShares] = useState([]);
  const [acceptedShares, setAcceptedShares] = useState([]);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharingError, setSharingError] = useState(null);
  const [syncNotification, setSyncNotification] = useState(null);

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
  const fetchAcceptedShares = useCallback(async (showNotification = false) => {
    if (!user) return;
    
    try {
      setSharingLoading(true);
      setSharingError(null);
      const shares = await api.getAcceptedSharedLists();
      setAcceptedShares(shares);
      
      // Only show notification if explicitly requested (usually after accepting a share)
      // This prevents the notification from appearing on every page load/refresh
      if (showNotification && shares.length > 0) {
        // Find the most recently accepted share (assumed to be the first one)
        const recentShare = shares[0];
        const itemCount = Array.isArray(recentShare.items) ? recentShare.items.length : 0;
        
        if (itemCount > 0) {
          setSyncNotification({
            message: `${itemCount} item${itemCount !== 1 ? 's' : ''} from "${recentShare.list_name}" added to your master list`,
            type: "success"
          });
          
          // Auto-dismiss after 5 seconds
          setTimeout(() => {
            setSyncNotification(null);
          }, 5000);
        }
      }
      
      return shares;
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
      throw error; // Re-throw the error to be caught by the modal
    } finally {
      setSharingLoading(false);
    }
  };

  // Accept a shared list
  const acceptShare = async (shareId) => {
    try {
      setSharingLoading(true);
      setSharingError(null);
      
      // Accept the share and get the response
      await api.respondToSharedList(shareId, 'accepted');
      
      // Remove from pending shares immediately
      setPendingShares(prev => prev.filter(share => share.id !== shareId));
      
      // Fetch fresh data with force refresh to ensure everything is up to date
      await fetchPendingShares();
      // Pass true to show notification about items added to master list
      const updatedAcceptedShares = await fetchAcceptedShares(true);
      
      // We don't need this anymore because fetchAcceptedShares will show the notification
      // with specific item count information
      
      return updatedAcceptedShares;
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
    syncNotification,
    clearSyncNotification: () => setSyncNotification(null),
    shareList,
    acceptShare,
    rejectShare,
    fetchPendingShares,
    fetchAcceptedShares
  };
}; 