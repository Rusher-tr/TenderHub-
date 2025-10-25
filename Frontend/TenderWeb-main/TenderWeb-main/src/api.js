// src/api.js
// Centralized API service for TenderLink frontend

const API_BASE = '/api'; // This will use the proxy configuration from vite.config.js
export { API_BASE }; // Export the API_BASE constant

function getAuthHeaders() {
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export async function login(payload) {
  if (!payload.role) {
    throw new Error('Role is required for login');
  }

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  
  if (!data.token || !data.role || data.role !== payload.role) {
    throw new Error('Invalid response from server');
  }
  
  sessionStorage.setItem('auth_token', data.token);
  sessionStorage.setItem('user_role', data.role);
  return data;
}

export async function signup(payload) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Validate stored auth token without full login
export async function validateToken(token) {
  // If no token provided, try to get from sessionStorage
  if (!token) {
    token = sessionStorage.getItem('auth_token');
    if (!token) return false;
  }
  
  try {
    // Check token validity with the server
    const res = await fetch(`${API_BASE}/auth/validate-token`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    return res.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// Tenders
export async function fetchTenders() {
  const token = sessionStorage.getItem('auth_token');
  const role = sessionStorage.getItem('user_role');
  
  if (!token) {
    console.error('No authentication token found in sessionStorage');
    throw new Error('No authentication token found');
  }

  // Use different endpoints based on user role
  const endpoint = role === 'Bidder' 
    ? `${API_BASE}/tenders/available-tenders` 
    : `${API_BASE}/tenders/my-tenders`;
    
  console.log(`Fetching tenders from ${endpoint} as ${role}`);
  
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Add credentials to ensure cookies are sent
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Fetch tenders error (${res.status})`, errorText);
      throw new Error(errorText || `HTTP error ${res.status}`);
    }
    
    const data = await res.json();
    console.log(`Successfully fetched ${data.length} tenders`);
    return data;
  } catch (error) {
    console.error('Fetch tenders error:', error);
    throw error;
  }
}

export async function createTender(tender) {
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const res = await fetch(`${API_BASE}/tenders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tender),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Create tender error:', errorText);
    throw new Error(errorText);
  }

  return res.json();
}

// Bids
export async function placeBid(tenderId, amount) {
  const res = await fetch(`${API_BASE}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ tenderId, amount }),
    credentials: 'include'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to place bid');
  }
  return res.json();
}

export async function fetchTenderBids(tenderId) {
  const res = await fetch(`${API_BASE}/bids/tender/${tenderId}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Evaluations
export async function scoreBid(bidId, score) {
  const res = await fetch(`${API_BASE}/evaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ bidId, score }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchBidEvaluations(bidId) {
  const res = await fetch(`${API_BASE}/evaluations/bid/${bidId}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Admin
// PATCH endpoint for updating tender status
export async function updateTenderStatus(tenderId, status) {
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    console.log(`Updating tender ${tenderId} status to ${status}`);
    
    // Simple POST request with minimal error handling for robustness
    const res = await fetch(`${API_BASE}/tenders/${tenderId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });

    // Log response for debugging
    console.log(`Status update response code: ${res.status}`);
    
    // Check for specific error status codes
    if (res.status === 400) {
      const error = await res.json();
      throw new Error(error.error || "Invalid status value");
    }
    
    if (res.status === 404) {
      throw new Error("Tender not found");
    }
    
    if (res.status === 500) {
      throw new Error("Server error - please try again later");
    }
    
    if (!res.ok) {
      throw new Error(`Failed to update status: ${res.statusText}`);
    }
    
    // Process successful response
    const data = await res.json();
    console.log('Update success:', data);
    return data;
  } catch (error) {
    console.error('Error updating tender status:', error);
    throw error;
  }
}

// Admin - Get all tenders (admin only)
export async function fetchAllTenders() {
  const token = sessionStorage.getItem('auth_token');
  const userRole = sessionStorage.getItem('user_role');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  if (userRole !== 'Admin') {
    throw new Error('Admin access required');
  }
  
  const res = await fetch(`${API_BASE}/tenders/admin/all-tenders`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }
  
  return res.json();
}

// Select a winning bid (Admin only)
export async function selectWinningBid(tenderId, bidId) {
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const res = await fetch(`${API_BASE}/winners`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',
    body: JSON.stringify({ tenderId, bidId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to select winning bid');
  }
  return res.json();
}

// Get all winners (Admin only)
export async function fetchAllWinners() {
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const res = await fetch(`${API_BASE}/winners`, {
      headers: { 
        'Authorization': `Bearer ${token}` 
      },
      credentials: 'include'
    });

    // Handle common error codes gracefully
    if (res.status === 404) {
      return [];
    }
    
    if (res.status === 500) {
      console.warn('Winners API error - returning empty array for now');
      return [];
    }
    
    if (!res.ok) {
      return []; // During development, just return empty array instead of breaking
    }
    
    const data = await res.json();
    return data || [];
  } catch (err) {
    console.error("Winner fetch error:", err);
    return []; // Return empty array instead of throwing
  }
}

// Get winner for a specific tender
export async function fetchTenderWinner(tenderId) {
  const res = await fetch(`${API_BASE}/winners/tender/${tenderId}`, {
    headers: { ...getAuthHeaders() },
    credentials: 'include'
  });

  if (!res.ok) {
    if (res.status === 404) {
      // No winner selected yet, return null instead of throwing
      return null;
    }
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch tender winner');
  }
  return res.json();
}
