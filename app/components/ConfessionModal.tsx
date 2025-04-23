import { useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useConfessions } from '../../hooks/useConfessions';
import { StoredConfession } from '@/app/lib/types';
import Image from 'next/image';
import { neuzeitGrotesk, txcPearl } from '@/app/utils/fonts';

interface ConfessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'have' | 'never';
  promptId: string;
}

export function ConfessionModal({ isOpen, onClose, type, promptId }: ConfessionModalProps) {
  const router = useRouter();
  const { context } = useMiniKit();
  const { addConfession } = useConfessions();
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a JPG, PNG, or GIF file.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('Image must be smaller than 5MB.');
      return;
    }

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
      }
      
      const { url } = await response.json();
      setImageUrl(url);
    } catch (error) {
      console.error('Failed to upload image:', error);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!context?.user?.fid) return;

    try {
      const newConfession = {
        promptId,
        userFid: context.user.fid,
        type,
        imageUrl: type === 'have' ? imageUrl : undefined,
        caption: type === 'have' ? caption : undefined,
        timestamp: Date.now()
      };
      
      await addConfession(newConfession);
      
      setCaption('');
      setImageUrl('');
      onClose();
      router.replace(`/prompts/${promptId}/success`);
    } catch (error) {
      console.error('Failed to submit confession:', error);
    }
  }, [addConfession, type, caption, context?.user?.fid, imageUrl, router, promptId, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="w-[70vw] bg-[#FCD9A8] rounded-lg p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 hover:opacity-80"
        >
          <img
            src="/images/icons/close-circle-line.svg"
            alt="Close"
            width={24}
            height={24}
            style={{ filter: 'brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(2559%) hue-rotate(354deg) brightness(91%) contrast(87%)' }}
          />
        </button>
        
        <div className="text-center mb-8">
          <h3 className={`${neuzeitGrotesk.className} text-[#B02A15] text-lg mb-2`}>
            YOUR RESPONSE IS...
          </h3>
          <h2 className={`${txcPearl.className} text-[#B02A15] text-7xl ${type === 'never' ? 'mb-6' : ''}`}>
            {type === 'have' ? (
              'I HAVE'
            ) : (
              <>
                I HAVE<br />NEVER
              </>
            )}
          </h2>
        </div>

        {type === 'have' && (
          <>
            <div className="mb-3">
              <div 
                className="border-[2px] border-dashed border-[#B8A58C] rounded-lg p-6 bg-white/35 text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-3">
                  <img
                    src="/images/icons/image-add-line.svg"
                    alt="Add image"
                    width={32}
                    height={32}
                  />
                  <label className={`${neuzeitGrotesk.className} block text-[#B8A58C] text-base leading-tight`}>
                    Got receipts? Upload a photo for a chance to earn (optional).
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </div>
                {isUploading && (
                  <div className="mt-2 text-[#B02A15]">Uploading...</div>
                )}
                {uploadError && (
                  <p className="mt-2 text-base text-[#B02A15]">{uploadError}</p>
                )}
                {imageUrl && (
                  <div className="mt-4">
                    <img src={imageUrl} alt="Uploaded" className="max-h-32 mx-auto rounded" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl('');
                        setUploadError('');
                      }}
                      className="mt-2 text-base text-[#B02A15] hover:text-[#8f2211]"
                    >
                      Remove photo
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-2">
              <div className="border-[2px] border-dashed border-[#B8A58C] rounded-lg bg-white/35">
                <input
                  value={caption}
                  onChange={(e) => {
                    if (e.target.value.length <= 120) {
                      setCaption(e.target.value);
                    }
                  }}
                  placeholder="caption this moment (optional)"
                  className={`${neuzeitGrotesk.className} w-full px-4 py-3 bg-transparent text-[#B02A15] text-base placeholder-[#B8A58C] focus:outline-none`}
                />
              </div>
              <div className="mt-1 text-right">
                <p className={`${neuzeitGrotesk.className} text-xs text-[#B02A15]/70`}>
                  {caption.length}/120
                </p>
              </div>
            </div>
          </>
        )}

        <div className={`flex justify-center ${type === 'have' ? 'mt-4' : 'mt-0'}`}>
          <button
            onClick={handleSubmit}
            disabled={!context?.user?.fid || isUploading}
            className={`${txcPearl.className} px-6 py-2 bg-[#B02A15] text-[#FCD9A8] rounded-full text-3xl hover:bg-[#8f2211] disabled:opacity-50 uppercase whitespace-nowrap`}
          >
            Confess for Free
          </button>
        </div>
      </div>
    </div>
  );
}