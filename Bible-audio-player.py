import pygame
import json
from pathlib import Path

# Initialize pygame
pygame.init()
pygame.mixer.init()

class BibleAudioPlayer:
    """
    Pure pygame version - works better on macOS!
    Think of this like creating a game window in SDL/OpenGL (similar to C graphics programming)
    """
    
    def __init__(self):
        # Window setup (like your HTML <body>)
        self.screen = pygame.display.set_mode((800, 700))
        pygame.display.set_caption("✝️ Bible Audio Player ✝️")
        
        # Load background image (like CSS background-image)
        try:
            self.bg_image = pygame.image.load("lamb.jpg")
            self.bg_image = pygame.transform.scale(self.bg_image, (800, 700))
            print("✓ lamb.jpg loaded successfully!")
        except:
            print("✗ lamb.jpg not found - using solid background")
            self.bg_image = None
        
        # Load GIF frames (pygame doesn't support animated GIFs directly, we'll load first frame)
        try:
            self.gif_image = pygame.image.load("jarvis.gif")
            self.gif_image = pygame.transform.scale(self.gif_image, (120, 120))
            print("✓ jarvis.gif loaded successfully!")
        except:
            print("✗ jarvis.gif not found - using placeholder")
            self.gif_image = None
        
        # Font setup (like CSS font-family)
        self.font_large = pygame.font.SysFont("Courier New", 20, bold=True)
        self.font_medium = pygame.font.SysFont("Courier New", 14)
        self.font_small = pygame.font.SysFont("Courier New", 11)
        
        # Player state (like your JavaScript variables)
        self.playlist = []
        self.index = 0
        self.is_playing = False
        self.volume = 0.7
        
        # Button rectangles (for click detection)
        self.play_btn = pygame.Rect(360, 380, 80, 35)
        self.prev_btn = pygame.Rect(270, 380, 80, 35)
        self.next_btn = pygame.Rect(450, 380, 80, 35)
        self.volume_slider = pygame.Rect(300, 450, 200, 20)
        
        # Colors (like CSS color values)
        self.COLOR_BG = (26, 26, 46)  # #1a1a2e
        self.COLOR_ACCENT = (181, 126, 222)  # #b57ede
        self.COLOR_BTN = (91, 89, 89)  # #5b5959
        self.COLOR_BORDER = (246, 237, 241)  # #f6edf1
        self.COLOR_TEXT = (255, 255, 255)
        
        # Load playlist
        self.load_playlist()
        
        # Main game loop flag
        self.running = True
        self.clock = pygame.time.Clock()
    
    def load_playlist(self):
        """Auto-generate playlist from audio folder"""
        audio_folder = Path("audio")
        
        if not audio_folder.exists():
            print("✗ No 'audio' folder found!")
            return
        
        mp3_files = sorted(audio_folder.glob("*.mp3"))
        
        for mp3_path in mp3_files:
            filename = mp3_path.name
            meta = self.parse_filename(filename)
            self.playlist.append({
                'src': str(mp3_path),
                'filename': filename,
                'book': meta['book'],
                'chapter': meta['chapter'],
                'title': meta['title']
            })
        
        print(f"✅ Found {len(self.playlist)} audio files")
        
        if self.playlist:
            self.load_track(0)
    
    def parse_filename(self, filename):
        """Parse your filename format: A01___01_Genesis_____ENGESVO2DA.mp3"""
        base = Path(filename).stem
        parts = base.split('___')
        
        if len(parts) >= 2:
            right_side = parts[1].split('_')
            chapter = right_side[0].lstrip('0') or '0'
            book = right_side[1] if len(right_side) > 1 else 'Unknown'
            book = book.strip('_')
            title = f"{book} {chapter}"
            return {'book': book, 'chapter': chapter, 'title': title}
        
        return {'book': base, 'chapter': '', 'title': base}
    
    def load_track(self, index):
        """Load and prepare a track"""
        if not self.playlist:
            return
        
        self.index = index
        track = self.playlist[index]
        
        try:
            pygame.mixer.music.load(track['src'])
            pygame.mixer.music.set_volume(self.volume)
            print(f"Loaded: {track['title']}")
        except Exception as e:
            print(f"Error loading track: {e}")
    
    def toggle_play_pause(self):
        """Play or pause the current track"""
        if self.is_playing:
            pygame.mixer.music.pause()
            self.is_playing = False
        else:
            if pygame.mixer.music.get_busy():
                pygame.mixer.music.unpause()
            else:
                pygame.mixer.music.play()
            self.is_playing = True
    
    def next_track(self):
        """Go to next track"""
        if not self.playlist:
            return
        self.index = (self.index + 1) % len(self.playlist)
        self.load_track(self.index)
        if self.is_playing:
            pygame.mixer.music.play()
    
    def prev_track(self):
        """Go to previous track"""
        if not self.playlist:
            return
        self.index = (self.index - 1) % len(self.playlist)
        self.load_track(self.index)
        if self.is_playing:
            pygame.mixer.music.play()
    
    def draw(self):
        """
        Draw everything (like rendering a frame in a game)
        This is similar to the render loop in OpenGL/SDL
        """
        # Draw background image or solid color
        if self.bg_image:
            self.screen.blit(self.bg_image, (0, 0))
        else:
            self.screen.fill(self.COLOR_BG)
        
        # Draw dark overlay for contrast
        overlay = pygame.Surface((800, 700))
        overlay.set_alpha(140)  # Semi-transparent
        overlay.fill((0, 0, 0))
        self.screen.blit(overlay, (0, 0))
        
        # Draw main player circle/container
        player_rect = pygame.Rect(175, 100, 450, 500)
        pygame.draw.rect(self.screen, self.COLOR_BG, player_rect, border_radius=20)
        pygame.draw.rect(self.screen, self.COLOR_BORDER, player_rect, 4, border_radius=20)
        
        # Draw GIF/visualizer circle
        if self.gif_image:
            gif_rect = self.gif_image.get_rect(center=(400, 200))
            self.screen.blit(self.gif_image, gif_rect)
            pygame.draw.circle(self.screen, (255, 105, 180), (400, 200), 65, 3)
        else:
            pygame.draw.circle(self.screen, (51, 51, 51), (400, 200), 60)
            pygame.draw.circle(self.screen, (255, 105, 180), (400, 200), 60, 3)
        
        # Draw title
        title_text = self.font_large.render("Bible Audio Player", True, (244, 240, 242))
        title_rect = title_text.get_rect(center=(400, 280))
        self.screen.blit(title_text, title_rect)
        
        # Draw now playing info
        if self.playlist:
            track = self.playlist[self.index]
            now_playing = self.font_medium.render(f"Now Playing: {track['title']}", True, self.COLOR_ACCENT)
            np_rect = now_playing.get_rect(center=(400, 320))
            self.screen.blit(now_playing, np_rect)
            
            book_chapter = self.font_small.render(f"{track['book']} {track['chapter']}", True, (200, 200, 200))
            bc_rect = book_chapter.get_rect(center=(400, 345))
            self.screen.blit(book_chapter, bc_rect)
        
        # Draw buttons
        self.draw_button(self.prev_btn, "⏮ Prev")
        self.draw_button(self.play_btn, "⏸ Pause" if self.is_playing else "▶ Play")
        self.draw_button(self.next_btn, "Next ⏭")
        
        # Draw volume label and slider
        vol_label = self.font_small.render("Volume", True, self.COLOR_TEXT)
        vol_rect = vol_label.get_rect(center=(400, 430))
        self.screen.blit(vol_label, vol_rect)
        
        pygame.draw.rect(self.screen, (80, 80, 80), self.volume_slider, border_radius=5)
        slider_pos = self.volume_slider.x + int(self.volume * self.volume_slider.width)
        pygame.draw.circle(self.screen, self.COLOR_ACCENT, (slider_pos, self.volume_slider.centery), 10)
        
        # Draw instructions at bottom
        instructions = self.font_small.render(f"Track {self.index + 1} of {len(self.playlist)}", True, (150, 150, 150))
        inst_rect = instructions.get_rect(center=(400, 550))
        self.screen.blit(instructions, inst_rect)
        
        pygame.display.flip()
    
    def draw_button(self, rect, text):
        """Draw a button with text"""
        pygame.draw.rect(self.screen, self.COLOR_BTN, rect, border_radius=6)
        pygame.draw.rect(self.screen, self.COLOR_TEXT, rect, 2, border_radius=6)
        
        text_surf = self.font_small.render(text, True, self.COLOR_TEXT)
        text_rect = text_surf.get_rect(center=rect.center)
        self.screen.blit(text_surf, text_rect)
    
    def handle_click(self, pos):
        """Handle mouse clicks (like addEventListener in JavaScript)"""
        if self.play_btn.collidepoint(pos):
            self.toggle_play_pause()
        elif self.prev_btn.collidepoint(pos):
            self.prev_track()
        elif self.next_btn.collidepoint(pos):
            self.next_track()
        elif self.volume_slider.collidepoint(pos):
            # Calculate volume based on click position
            rel_x = pos[0] - self.volume_slider.x
            self.volume = max(0, min(1, rel_x / self.volume_slider.width))
            pygame.mixer.music.set_volume(self.volume)
    
    def run(self):
        """
        Main game loop (like your event loop in JavaScript)
        This is similar to: while(1) { handle_events(); render(); } in C
        """
        while self.running:
            # Handle events (like addEventListener)
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                elif event.type == pygame.MOUSEBUTTONDOWN:
                    self.handle_click(event.pos)
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_SPACE:
                        self.toggle_play_pause()
                    elif event.key == pygame.K_RIGHT:
                        self.next_track()
                    elif event.key == pygame.K_LEFT:
                        self.prev_track()
            
            # Draw everything
            self.draw()
            
            # Control frame rate (60 FPS)
            self.clock.tick(60)
        
        pygame.quit()


# Run the app (like your HTML <script> at the bottom)
if __name__ == "__main__":
    app = BibleAudioPlayer()
    app.run()