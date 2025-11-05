// Azure User Profile Service using REST API with Generic SAS Token
// Clean approach using MERGE with generic SAS token (works for all tables)

// Azure Table Storage Configuration - Using Environment Variables
const AZURE_STORAGE_ACCOUNT_NAME = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
const AZURE_STORAGE_ENDPOINT = `https://${AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`;

// Users Table SAS Token from environment (more secure)
const USERS_SAS_TOKEN = import.meta.env.VITE_USERS_SAS_TOKEN || '?se=2030-12-31T23%3A59%3A59Z&sp=raud&spr=https&sv=2019-02-02&tn=Users&sig=2l3%2BQyFe9xIY8U3ntofjnmANQ1UN1WxJgGnqXNVvX9I%3D';

// Table names
const USERS_TABLE = 'Users';

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  practiceName?: string;
  licenseNumber?: string;
  password?: string; // Password for authentication
  createdAt: string;
  lastLogin: string;
  partitionKey: string;
  rowKey: string;
}

// Helper function to create entity URL with generic SAS
function getEntityUrl(partitionKey: string, rowKey: string): string {
  const encodedPartitionKey = encodeURIComponent(partitionKey);
  const encodedRowKey = encodeURIComponent(rowKey);
  return `${AZURE_STORAGE_ENDPOINT}/${USERS_TABLE}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')${USERS_SAS_TOKEN}`;
}

// Get user by email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const entityUrl = getEntityUrl('user', email);
    
    const response = await fetch(entityUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'x-ms-version': '2019-02-02'
      },
      mode: 'cors'
    });

    if (response.ok) {
      const data = await response.json();
      
      const user: User = {
        id: data.id || data.RowKey || email,
        name: data.name || data.Name || '',
        email: data.email || data.Email || email,
        role: data.role || data.Role || '',
        practiceName: data.practiceName || data.PracticeName || '',
        licenseNumber: data.licenseNumber || data.LicenseNumber || '',
        createdAt: data.createdAt || data.CreatedAt || new Date().toISOString(),
        lastLogin: data.lastLogin || data.LastLogin || new Date().toISOString(),
        partitionKey: data.partitionKey || data.PartitionKey || 'user',
        rowKey: data.rowKey || data.RowKey || email
      };
      
      return user;
    } else if (response.status === 404) {
      return null;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to get user:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting user:', error);
    return null;
  }
};

// Create or update user profile
export const saveUserProfile = async (userData: Partial<User>): Promise<User | null> => {
  try {
    if (!userData.email) {
      console.error('❌ Email is required for user profile');
      return null;
    }
    
    const entityUrl = getEntityUrl('user', userData.email);

    const existingUser = await getUserByEmail(userData.email);

    const userToSave: any = {
      "PartitionKey": "user",
      "RowKey": userData.email,
      "name": userData.name || '',
      "email": userData.email,
      "role": userData.role || '',
      "practiceName": userData.practiceName || '',
      "licenseNumber": userData.licenseNumber || '',
      "createdAt": existingUser?.createdAt || new Date().toISOString(),
      "lastLogin": new Date().toISOString()
    };
    
    // Include password if provided (for user creation/authentication)
    if (userData.password !== undefined) {
      userToSave.password = userData.password;
    }

    console.log('📝 User to save:', userToSave);

    const response = await fetch(entityUrl, {
      method: existingUser ? 'MERGE' : 'POST', // Use MERGE if exists, POST if new
      headers: {
        'If-Match': existingUser ? '*' : undefined, // Only for MERGE
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'x-ms-version': '2019-02-02'
      },
      body: JSON.stringify(userToSave),
      mode: 'cors'
    });

    console.log('📡 Save response status:', response.status);

    if (response.ok || response.status === 204 || response.status === 201) {
      console.log('✅ User profile saved successfully!');
      return getUserByEmail(userData.email);
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to save user profile:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error saving user profile:', error);
    return null;
  }
};

// Update user profile (for existing users)
export const updateUserProfile = async (email: string, profileData: { name?: string; role?: string }): Promise<User | null> => {
  try {
    console.log('🔄 Updating user profile in Azure REST API...', { email, profileData });
    
    const entityUrl = getEntityUrl('user', email);
    console.log('🔗 Entity URL:', entityUrl);

    // Prepare the update body
    const updateBody: any = {
      "PartitionKey": "user",
      "RowKey": email,
      "lastLogin": new Date().toISOString()
    };

    // Only include fields that are being updated
    if (profileData.name !== undefined) updateBody.name = profileData.name;
    if (profileData.role !== undefined) updateBody.role = profileData.role;

    console.log('📝 Update body:', updateBody);

    const response = await fetch(entityUrl, {
      method: 'MERGE', // Use MERGE, not PATCH
      headers: {
        'If-Match': '*',
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'x-ms-version': '2019-02-02'
      },
      body: JSON.stringify(updateBody),
      mode: 'cors'
    });

    console.log('📡 Update response status:', response.status);

    if (response.ok || response.status === 204) {
      console.log('✅ User profile updated successfully!');
      // Get the updated user data
      const updatedUser = await getUserByEmail(email);
      return updatedUser;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to update user profile:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    return null;
  }
};