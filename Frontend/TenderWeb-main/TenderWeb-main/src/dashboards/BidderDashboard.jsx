import React, { useState, useEffect } from 'react';
import { useTenders } from '../useTenders';
import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';
import './BidderDashboard.css';

const BidderDashboard = () => {
  const { tenders, placeBid, loading, error, refreshTenders, isAuthenticated } = useTenders();
  const { user, loading: authLoading } = useAuth();
  const [bidAmounts, setBidAmounts] = useState({});
  const [bidStatus, setBidStatus] = useState({});  // Refresh tenders when component mounts
  useEffect(() => {
    console.log("BidderDashboard: Refreshing tenders");
    refreshTenders().then(() => {
      console.log("BidderDashboard: Tenders refreshed successfully");
    }).catch(err => {
      console.error("BidderDashboard: Error refreshing tenders", err);
    });
  }, [refreshTenders]);

  // Log tenders whenever they change
  useEffect(() => {
    console.log("BidderDashboard: Tenders data updated", tenders);
  }, [tenders]);

  // Check if user is actually a bidder
  if (!authLoading && (!user || user.role !== 'Bidder')) {
    console.log("BidderDashboard: User is not a bidder, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  // Helper function to check if a tender is biddable
  const isTenderBiddable = (tender) => {
    return (tender.status === 'Published' || tender.status === 'Approved') && 
           new Date(tender.deadline) > new Date();
  };

  // Get a status message for the tender
  const getTenderStatusMessage = (tender) => {
    if (new Date(tender.deadline) < new Date()) {
      return { 
        message: "Deadline has passed. No new bids are accepted.",
        type: "deadline-passed"
      };
    }
    
    switch(tender.status) {
      case 'Published':
        return { 
          message: "This tender is published and open for bidding.", 
          type: "status-info"
        };
      case 'Approved':
        return { 
          message: "This tender has been approved by an administrator and is open for bidding.", 
          type: "status-info" 
        };
      default:
        return null;
    }
  };

  const handleChange = (e, tenderId) => {
    const amount = e.target.value;
    // Only allow numbers and decimals
    if (amount === '' || /^\d*\.?\d{0,2}$/.test(amount)) {
      setBidAmounts({ ...bidAmounts, [tenderId]: amount });
      // Clear any previous status when user starts typing
      setBidStatus(prev => ({ ...prev, [tenderId]: null }));
    }
  };
  const handlePlaceBid = async (tenderId) => {
    const amount = parseFloat(bidAmounts[tenderId]);
    if (!amount || amount <= 0) {
      setBidStatus(prev => ({ 
        ...prev, 
        [tenderId]: { 
          type: 'error', 
          message: 'Please enter a valid bid amount' 
        } 
      }));
      return;
    }

    // Find the tender to check its status
    const tender = tenders.find(t => t.tender_id === tenderId);
    if (!tender || (tender.status !== 'Published' && tender.status !== 'Approved')) {
      setBidStatus(prev => ({ 
        ...prev, 
        [tenderId]: { 
          type: 'error', 
          message: 'You can only bid on published or approved tenders' 
        } 
      }));
      return;
    }

    if (new Date(tender.deadline) < new Date()) {
      setBidStatus(prev => ({ 
        ...prev, 
        [tenderId]: { 
          type: 'error', 
          message: 'The deadline for this tender has passed' 
        } 
      }));
      return;
    }

    try {
      await placeBid(tenderId, amount);
      setBidAmounts({ ...bidAmounts, [tenderId]: '' });
      setBidStatus(prev => ({ 
        ...prev, 
        [tenderId]: { 
          type: 'success', 
          message: 'Bid placed successfully!' 
        } 
      }));
      // Refresh tenders to show updated bids
      refreshTenders();
    } catch (err) {
      setBidStatus(prev => ({ 
        ...prev, 
        [tenderId]: { 
          type: 'error',
          message: err.message 
        } 
      }));
    }
  };
  if (loading || authLoading) {
    return (
      <div className="bidder-dashboard">
        <h1>Bidder Dashboard</h1>
        <div className="loading-container">
          <p>Loading tenders...</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bidder-dashboard">
        <h1>Bidder Dashboard</h1>
        <div className="error-container">
          <p className="error-message">Error loading tenders: {error}</p>
          <button 
            onClick={refreshTenders} 
            className="retry-button"
          >
            Retry
          </button>
          <p className="debug-info">
            Authentication Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}<br />
            User Role: {user?.role || 'No Role'}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="bidder-dashboard">
      <h1>Bidder Dashboard</h1>
      
      <div className="dashboard-info">
        <p>Here you can view and bid on tenders. Tenders with the following statuses are shown:</p>
        <ul className="status-info">
          <li><span className="status-badge published">Published</span> - These are tenders that have been published by buyers and are ready for bidding.</li>
          <li><span className="status-badge approved">Approved</span> - These are tenders that have been approved by administrators and are open for bidding.</li>
        </ul>
        <p>You can place bids on tenders until their deadline. Your bid history is shown below each tender.</p>
        <p className="bid-process-info">After you place a bid, evaluators may review and score it. Highly scored bids are more likely to be selected as winners.</p>
      </div>

      <h2>Available Tenders</h2>
      
      {tenders.filter(tender => tender.status === 'Published' || tender.status === 'Approved').length === 0 ? (
        <div className="no-tenders-message">
          <p>No published or approved tenders are currently available.</p>
          <p className="no-tenders-hint">This may be because:</p>
          <ul>
            <li>No tenders have been published or approved yet</li>
            <li>All tenders have passed their deadlines</li>
            <li>You may need to refresh the page</li>
          </ul>
          <button onClick={refreshTenders} className="refresh-button">
            Refresh Tenders
          </button>
          <p className="debug-info">
            Total tenders loaded: {tenders.length}<br />
            Authentication Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}<br />
            User Role: {user?.role || 'No Role'}
          </p>
        </div>
      ) : (
        <ul className="tenders-list">
          {tenders
            .filter(tender => tender.status === 'Published' || tender.status === 'Approved')
            .map(tender => {
              const canBid = isTenderBiddable(tender);
              
              return (
                <li key={tender.tender_id} className="bid-card">
                  <div className="tender-header">
                    <h3>{tender.title}</h3>
                    <span className={`status-badge ${tender.status.toLowerCase()}`}>{tender.status}</span>
                  </div>
                  <div className="tender-details">
                    <p><strong>Issue Date:</strong> {new Date(tender.issue_date).toLocaleDateString()}</p>
                    <p><strong>Deadline:</strong> {new Date(tender.deadline).toLocaleDateString()}</p>
                    <p><strong>Description:</strong> {tender.description}</p>
                    
                    {/* Display status message */}
                    {getTenderStatusMessage(tender) && (
                      <p className={getTenderStatusMessage(tender).type}>
                        {getTenderStatusMessage(tender).message}
                      </p>
                    )}
                  </div>

                  {canBid && (
                    <div className="place-bid-section">
                      <input
                        type="number"
                        placeholder="Your bid amount"
                        value={bidAmounts[tender.tender_id] || ''}
                        onChange={e => handleChange(e, tender.tender_id)}
                        className="bid-input"
                        disabled={loading}
                        min="1"
                        step="0.01"
                      />
                      <button
                        onClick={() => handlePlaceBid(tender.tender_id)}
                        className="bid-button"
                        disabled={loading}
                      >
                        {loading ? 'Placing Bid...' : 'Place Bid'}
                      </button>
                    </div>
                  )}

                  {bidStatus[tender.tender_id] && (
                    <p className={`bid-status ${bidStatus[tender.tender_id].type}`}>
                      {bidStatus[tender.tender_id].message}
                    </p>
                  )}
                  {tender.bids?.length > 0 && (
                    <div className="bid-history">
                      <h4>Your Bids on this Tender:</h4>
                      <ul>
                        {tender.bids
                          .filter(bid => bid.bidder_id === user.userId)
                          .sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date)) // Show newest first
                          .map((bid) => (
                            <li key={bid.bid_id} className="your-bid">
                              <div className="bid-info">
                                <span className="bid-amount">💰 Amount: ${parseFloat(bid.amount).toFixed(2)}</span>
                                <span className="bid-date">Submitted: {new Date(bid.submission_date).toLocaleString()}</span>
                                {bid.status && 
                                  <span className={`bid-status-tag ${bid.status.toLowerCase()}`}>{bid.status}</span>
                                }
                              </div>
                              {bid.evaluations?.length > 0 && (
                                <div className="bid-evaluation">
                                  <span>Evaluation score: {bid.evaluations[0].score}/10</span>
                                </div>
                              )}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      )}
      
      <h2>Your Bid History</h2>
      <div className="bid-history-section">
        {tenders
          .filter(tender => tender.bids?.some(bid => bid.bidder_id === user.userId))
          .length === 0 ? (
            <p>You haven't placed any bids yet.</p>
          ) : (
            <ul className="history-list">
              {tenders
                .filter(tender => tender.bids?.some(bid => bid.bidder_id === user.userId))
                .map(tender => (
                  <li key={tender.tender_id} className="history-item">
                    <h3>{tender.title}</h3>
                    <p><strong>Status:</strong> <span className={`status-badge ${tender.status.toLowerCase()}`}>{tender.status}</span></p>
                    <div className="bid-list">
                      {tender.bids
                        .filter(bid => bid.bidder_id === user.userId)
                        .map(bid => (
                          <div key={bid.bid_id} className="bid-entry">
                            <p>
                              <strong>Amount:</strong> ${parseFloat(bid.amount).toFixed(2)}
                              <span className="bid-date">Submitted: {new Date(bid.submission_date).toLocaleString()}</span>
                            </p>
                            {bid.evaluations && bid.evaluations.length > 0 && (
                              <div className="evaluation-info">
                                <p><strong>Evaluations:</strong></p>
                                <ul>
                                  {bid.evaluations.map(evaluation => (
                                    <li key={evaluation.evaluation_id}>
                                      Score: {evaluation.score}/10
                                      <span className="eval-date">Evaluated: {new Date(evaluation.evaluated_at).toLocaleDateString()}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </li>
                ))}
            </ul>
          )}
      </div>
    </div>
  );
};

export default BidderDashboard;
