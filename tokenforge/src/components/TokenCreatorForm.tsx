import React, { useState, useEffect, ChangeEvent } from 'react';
import './styles.css';
import { createTokenWithMetadata } from '../services/TokenService';
import { File } from 'nft.storage';

interface FormData {
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  totalSupply: string;
  description: string;
  image: File | null;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  revokeMintAuthority: boolean;
  revokeFreezeAuthority: boolean;
  revokeUpdateAuthority: boolean;
  modifyCreatorInfo: boolean;
  creatorName: string;
  creatorWebsite: string;
}

interface FormErrors {
  tokenName: string;
  tokenSymbol: string;
  decimals: string;
  totalSupply: string;
  image: string;
}

const TokenCreatorForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    tokenName: '',
    tokenSymbol: '',
    decimals: 9, // Default value as per requirements
    totalSupply: '',
    description: '',
    image: null,
    website: '',
    twitter: '',
    telegram: '',
    discord: '',
    revokeMintAuthority: false,
    revokeFreezeAuthority: false,
    revokeUpdateAuthority: false,
    modifyCreatorInfo: false,
    creatorName: '',
    creatorWebsite: '',
  });

  const [errors, setErrors] = useState<FormErrors>({
    tokenName: '',
    tokenSymbol: '',
    decimals: '',
    totalSupply: '',
    image: '',
  });

  const [totalCost, setTotalCost] = useState<number>(0.1); // Base cost in SOL
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [creationStatus, setCreationStatus] = useState<string>('');
  const [creationResult, setCreationResult] = useState<any>(null);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Calculate total cost whenever relevant form fields change
  useEffect(() => {
    let cost = 0.1; // Base cost
    if (formData.revokeMintAuthority) cost += 0.1;
    if (formData.revokeFreezeAuthority) cost += 0.1;
    if (formData.revokeUpdateAuthority) cost += 0.1;
    if (formData.modifyCreatorInfo) cost += 0.1;
    setTotalCost(cost);
  }, [
    formData.revokeMintAuthority,
    formData.revokeFreezeAuthority,
    formData.revokeUpdateAuthority,
    formData.modifyCreatorInfo,
  ]);

  // Handle input changes for text fields
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    // Clear errors when the user types
    if (name in errors) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  // Handle numeric input for decimals
  const handleDecimalsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 18) {
      setFormData({ ...formData, decimals: value });
      setErrors({ ...errors, decimals: '' });
    } else {
      setErrors({ ...errors, decimals: 'Decimals must be between 0 and 18' });
    }
  };

  // Handle total supply with commas
  const handleSupplyChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Allow numbers and commas
    const value = e.target.value.replace(/[^0-9,]/g, '');
    setFormData({ ...formData, totalSupply: value });
    setErrors({ ...errors, totalSupply: '' });
  };

  // Handle image upload
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file type
      if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
        setErrors({ ...errors, image: 'Only JPG and PNG images are allowed' });
        return;
      }
      
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, image: 'Image must be less than 5MB' });
        return;
      }
      
      // Convert to NFT.Storage File type
      const nftStorageFile = new File([file], file.name, { type: file.type });
      
      setFormData({ ...formData, image: nftStorageFile });
      setErrors({ ...errors, image: '' });
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      tokenName: '',
      tokenSymbol: '',
      decimals: '',
      totalSupply: '',
      image: '',
    };
    
    let isValid = true;

    // Required field validation
    if (!formData.tokenName) {
      newErrors.tokenName = 'Token name is required';
      isValid = false;
    }

    if (!formData.tokenSymbol) {
      newErrors.tokenSymbol = 'Token symbol is required';
      isValid = false;
    } else if (formData.tokenSymbol.length > 8) {
      newErrors.tokenSymbol = 'Symbol cannot exceed 8 characters';
      isValid = false;
    }

    // Validate decimals
    if (formData.decimals < 0 || formData.decimals > 18) {
      newErrors.decimals = 'Decimals must be between 0 and 18';
      isValid = false;
    }

    // Validate supply
    const supplyWithoutCommas = formData.totalSupply.replace(/,/g, '');
    if (!supplyWithoutCommas) {
      newErrors.totalSupply = 'Total supply is required';
      isValid = false;
    } else {
      const numericSupply = parseFloat(supplyWithoutCommas);
      if (isNaN(numericSupply) || numericSupply <= 0) {
        newErrors.totalSupply = 'Supply must be greater than 0';
        isValid = false;
      }
    }

    // Image is required
    if (!formData.image) {
      newErrors.image = 'Token image is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Check if Phantom Wallet is connected
  const checkWalletConnection = (): boolean => {
    if (!window.solana || !window.solana.isPhantom || !window.solana.isConnected) {
      alert('Please connect your Phantom Wallet first');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous creation states
    setCreationStatus('');
    setCreationResult(null);
    setCreationError(null);
    
    // Validate form inputs
    if (!validateForm()) {
      return;
    }
    
    // Check if wallet is connected
    if (!checkWalletConnection()) {
      return;
    }
    
    try {
      setIsCreating(true);
      setCreationStatus('Starting token creation process...');
      
      const supplyWithoutCommas = formData.totalSupply.replace(/,/g, '');
      const numericSupply = parseFloat(supplyWithoutCommas);
      
      // Prepare token configuration
      const tokenConfig = {
        name: formData.tokenName,
        symbol: formData.tokenSymbol,
        description: formData.description,
        decimals: formData.decimals,
        totalSupply: numericSupply,
        image: formData.image as File,
        socialLinks: {
          website: formData.website,
          twitter: formData.twitter,
          telegram: formData.telegram,
          discord: formData.discord,
        },
        revokeMintAuthority: formData.revokeMintAuthority,
        revokeFreezeAuthority: formData.revokeFreezeAuthority,
        revokeUpdateAuthority: formData.revokeUpdateAuthority,
        ...(formData.modifyCreatorInfo && {
          creatorInfo: {
            name: formData.creatorName,
            website: formData.creatorWebsite,
          },
        }),
      };
      
      setCreationStatus('Uploading image to IPFS...');
      
      // Create token with metadata
      const result = await createTokenWithMetadata(window.solana, tokenConfig);
      
      setCreationStatus('Token created successfully!');
      setCreationResult(result);
      
      console.log('Token created:', result);
      
    } catch (error) {
      console.error('Error creating token:', error);
      setCreationStatus('Token creation failed.');
      setCreationError((error instanceof Error ? error.message : 'Failed to create token'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="token-creator-form">
      <h2 className="form-title">Create Your Token</h2>
      
      {/* Show creation result if available */}
      {creationResult && (
        <div className="creation-result">
          <h3>Token Created Successfully!</h3>
          <div className="result-item">
            <strong>Token Mint Address:</strong>
            <a 
              href={`https://explorer.solana.com/address/${creationResult.mintAddress}?cluster=devnet`}
              target="_blank" 
              rel="noopener noreferrer"
            >
              {creationResult.mintAddress}
            </a>
          </div>
          <div className="result-item">
            <strong>Token Account:</strong>
            <a 
              href={`https://explorer.solana.com/address/${creationResult.tokenAddress}?cluster=devnet`}
              target="_blank" 
              rel="noopener noreferrer"
            >
              {creationResult.tokenAddress}
            </a>
          </div>
          <div className="result-item">
            <strong>Metadata:</strong>
            <a 
              href={creationResult.metadataUrl}
              target="_blank" 
              rel="noopener noreferrer"
            >
              View Metadata
            </a>
          </div>
        </div>
      )}
      
      {/* Show error if there was an issue */}
      {creationError && (
        <div className="creation-error">
          <h3>Error Creating Token</h3>
          <p>{creationError}</p>
        </div>
      )}
      
      {/* Show creation status */}
      {isCreating && (
        <div className="creation-status">
          <div className="spinner"></div>
          <p>{creationStatus}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Basic Information</h3>
          
          {/* Token Name */}
          <div className="form-group">
            <label htmlFor="tokenName">
              Token Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="tokenName"
              name="tokenName"
              value={formData.tokenName}
              onChange={handleInputChange}
              className={errors.tokenName ? 'error' : ''}
              disabled={isCreating}
            />
            {errors.tokenName && <span className="error-message">{errors.tokenName}</span>}
          </div>
          
          {/* Token Symbol */}
          <div className="form-group">
            <label htmlFor="tokenSymbol">
              Token Symbol <span className="required">*</span>
              <span className="hint">(max 8 characters)</span>
            </label>
            <input
              type="text"
              id="tokenSymbol"
              name="tokenSymbol"
              value={formData.tokenSymbol}
              onChange={handleInputChange}
              maxLength={8}
              className={errors.tokenSymbol ? 'error' : ''}
              disabled={isCreating}
            />
            {errors.tokenSymbol && <span className="error-message">{errors.tokenSymbol}</span>}
          </div>
          
          {/* Decimals */}
          <div className="form-group">
            <label htmlFor="decimals">
              Decimals <span className="hint">(0-18, default: 9)</span>
            </label>
            <input
              type="number"
              id="decimals"
              name="decimals"
              value={formData.decimals}
              onChange={handleDecimalsChange}
              min={0}
              max={18}
              className={errors.decimals ? 'error' : ''}
              disabled={isCreating}
            />
            {errors.decimals && <span className="error-message">{errors.decimals}</span>}
          </div>
          
          {/* Total Supply */}
          <div className="form-group">
            <label htmlFor="totalSupply">
              Total Supply <span className="required">*</span>
            </label>
            <input
              type="text"
              id="totalSupply"
              name="totalSupply"
              value={formData.totalSupply}
              onChange={handleSupplyChange}
              placeholder="e.g., 1,000,000"
              className={errors.totalSupply ? 'error' : ''}
              disabled={isCreating}
            />
            {errors.totalSupply && <span className="error-message">{errors.totalSupply}</span>}
          </div>
          
          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              disabled={isCreating}
            />
          </div>
          
          {/* Image Upload */}
          <div className="form-group">
            <label htmlFor="image">
              Token Image <span className="required">*</span> <span className="hint">(JPG/PNG, max 5MB)</span>
            </label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/jpeg, image/png"
              onChange={handleImageUpload}
              className={errors.image ? 'error' : ''}
              disabled={isCreating}
            />
            {errors.image && <span className="error-message">{errors.image}</span>}
            
            {/* Image Preview */}
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Token preview" />
              </div>
            )}
          </div>
        </div>
        
        {/* Social Links */}
        <div className="form-section">
          <h3>Social Links</h3>
          
          <div className="form-group">
            <label htmlFor="website">Website URL</label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="https://yourwebsite.com"
              disabled={isCreating}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="twitter">Twitter</label>
            <input
              type="text"
              id="twitter"
              name="twitter"
              value={formData.twitter}
              onChange={handleInputChange}
              placeholder="@yourtwitterhandle"
              disabled={isCreating}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="telegram">Telegram</label>
            <input
              type="text"
              id="telegram"
              name="telegram"
              value={formData.telegram}
              onChange={handleInputChange}
              placeholder="t.me/yourgroupname"
              disabled={isCreating}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="discord">Discord</label>
            <input
              type="text"
              id="discord"
              name="discord"
              value={formData.discord}
              onChange={handleInputChange}
              placeholder="discord.gg/yourserver"
              disabled={isCreating}
            />
          </div>
        </div>
        
        {/* Advanced Options */}
        <div className="form-section">
          <h3>Advanced Options</h3>
          
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="revokeMintAuthority"
              name="revokeMintAuthority"
              checked={formData.revokeMintAuthority}
              onChange={handleInputChange}
              disabled={isCreating}
            />
            <label htmlFor="revokeMintAuthority">
              Revoke Mint Authority (+0.1 SOL)
            </label>
          </div>
          
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="revokeFreezeAuthority"
              name="revokeFreezeAuthority"
              checked={formData.revokeFreezeAuthority}
              onChange={handleInputChange}
              disabled={isCreating}
            />
            <label htmlFor="revokeFreezeAuthority">
              Revoke Freeze Authority (+0.1 SOL)
            </label>
          </div>
          
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="revokeUpdateAuthority"
              name="revokeUpdateAuthority"
              checked={formData.revokeUpdateAuthority}
              onChange={handleInputChange}
              disabled={isCreating}
            />
            <label htmlFor="revokeUpdateAuthority">
              Revoke Update Authority (+0.1 SOL)
            </label>
          </div>
          
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="modifyCreatorInfo"
              name="modifyCreatorInfo"
              checked={formData.modifyCreatorInfo}
              onChange={handleInputChange}
              disabled={isCreating}
            />
            <label htmlFor="modifyCreatorInfo">
              Modify Creator Information (+0.1 SOL)
            </label>
          </div>
          
          {/* Creator info fields (only show when modifyCreatorInfo is checked) */}
          {formData.modifyCreatorInfo && (
            <div className="creator-info">
              <div className="form-group">
                <label htmlFor="creatorName">Creator Name</label>
                <input
                  type="text"
                  id="creatorName"
                  name="creatorName"
                  value={formData.creatorName}
                  onChange={handleInputChange}
                  disabled={isCreating}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="creatorWebsite">Creator Website</label>
                <input
                  type="url"
                  id="creatorWebsite"
                  name="creatorWebsite"
                  value={formData.creatorWebsite}
                  onChange={handleInputChange}
                  placeholder="https://creatorwebsite.com"
                  disabled={isCreating}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Cost Summary */}
        <div className="cost-summary">
          <h3>Cost Summary</h3>
          <p>Base Cost: 0.1 SOL</p>
          {formData.revokeMintAuthority && <p>Revoke Mint Authority: +0.1 SOL</p>}
          {formData.revokeFreezeAuthority && <p>Revoke Freeze Authority: +0.1 SOL</p>}
          {formData.revokeUpdateAuthority && <p>Revoke Update Authority: +0.1 SOL</p>}
          {formData.modifyCreatorInfo && <p>Modify Creator Info: +0.1 SOL</p>}
          <p className="total-cost">
            Total Cost: <strong>{totalCost.toFixed(1)} SOL</strong>
          </p>
        </div>
        
        {/* Submit button */}
        <button 
          type="submit" 
          className="submit-button"
          disabled={isCreating}
        >
          {isCreating ? 'Creating Token...' : 'Create Token'}
        </button>
      </form>
    </div>
  );
};

export default TokenCreatorForm;