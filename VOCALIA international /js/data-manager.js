// ============================================
// DATA MANAGER - VERSION SUPABASE COMPLÈTE
// CORRIGÉ : id + folder_id en TEXT + devices → device_ids
// ============================================

class DataManager {
    constructor() {
        this.storageKey = 'rapportsApp';
        this.maxBrouillons = 10;
        this.maxRapports = 20;
        this.currentFolderId = null;
        this.syncInProgress = false;

        // Écouter les changements de langue pour re-rendre l'UI
        window.addEventListener('languageChanged', () => {
            console.log('🌐 Langue changée - Rafraîchissement des rapports et brouillons');
            this.refreshUI();
        });

        // Fermer les dropdowns de traduction quand on clique ailleurs
        document.addEventListener('click', (event) => {
            // Si le click n'est pas sur un bouton de traduction ou dans un dropdown
            if (!event.target.closest('.translate-btn') && !event.target.closest('.translate-dropdown')) {
                document.querySelectorAll('.translate-dropdown').forEach(dropdown => {
                    dropdown.style.display = 'none';
                });
            }
        });
    }

    // Rafraîchir l'UI après changement de langue
    refreshUI() {
        const data = this.loadAppData();

        // Re-rendre les brouillons si l'onglet est actif
        const brouillonsContainer = document.getElementById('brouillonsList');
        if (brouillonsContainer) {
            this.updateBrouillonsUI(data.brouillons || []);
        }

        // Re-rendre les rapports si l'onglet est actif
        const rapportsContainer = document.getElementById('rapportsList');
        if (rapportsContainer) {
            this.updateRapportsUI(data.rapports || []);
        }
    }

    // === VÉRIFIER SI ON PEUT UTILISER SUPABASE ===
    
    canUseSupabase() {
        const currentUser = window.appManager?.getCurrentUser();
        return !!(currentUser && currentUser.id && window.supabaseClient);
    }

    getUserId() {
        const currentUser = window.appManager?.getCurrentUser();
        return currentUser?.id || null;
    }

    // === SYNCHRONISATION INITIALE AU LOGIN ===
    
    async syncFromSupabase() {
        if (!this.canUseSupabase() || this.syncInProgress) return;
        
        this.syncInProgress = true;
        console.log('🔄 Synchronisation depuis Supabase...');
        
        try {
            const userId = this.getUserId();
            
            const [draftsResult, reportsResult, foldersResult] = await Promise.all([
                window.supabaseClient.from('drafts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                window.supabaseClient.from('reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                window.supabaseClient.from('folders').select('*').eq('user_id', userId).order('created_at', { ascending: false })
            ]);
            
            if (draftsResult.error) throw draftsResult.error;
            if (reportsResult.error) throw reportsResult.error;
            if (foldersResult.error) throw foldersResult.error;
            
            const data = {
                brouillons: (draftsResult.data || []).map(d => this.convertDraftFromSupabase(d)),
                rapports: (reportsResult.data || []).map(r => this.convertReportFromSupabase(r)),
                folders: (foldersResult.data || []).map(f => this.convertFolderFromSupabase(f)),
                lastSaved: new Date().toISOString()
            };
            
            this.saveAppData(data);
            
            console.log('✅ Synchronisation terminée:', {
                brouillons: data.brouillons.length,
                rapports: data.rapports.length,
                folders: data.folders.length
            });
            
            return data;
            
        } catch (error) {
            console.error('❌ Erreur synchronisation:', error);
            Utils.showToast('Erreur de synchronisation. Mode hors ligne activé.', 'warning');
            return this.loadAppData();
        } finally {
            this.syncInProgress = false;
        }
    }

    // === CONVERSION SUPABASE → LOCAL ===
    
    convertDraftFromSupabase(draft) {
        return {
            id: draft.id,
            title: draft.title || t('new.report'),
            generatedReport: draft.generated_report,
            createdAt: draft.created_at,
            sourceType: draft.source_type || 'recording',
            sourceInfo: draft.source_info,
            audioUrl: draft.audio_url,
            status: draft.status || 'generating',
            isModified: draft.is_modified || false
        };
    }
    
    convertReportFromSupabase(report) {
        return {
            id: report.id,
            title: report.title,
            content: report.content,
            validatedAt: report.validated_at || report.created_at,
            createdAt: report.created_at,
            folderId: report.folder_id,
            status: report.status,
            sourceType: report.source_type,
            sourceInfo: report.source_info,
            isModified: report.is_modified || false,
            hasPdf: report.has_pdf || false,
            pdfGenerated: report.pdf_generated || false,
            pdfUrl: report.pdf_url,
            pdfData: report.pdf_data,
            isTranslation: report.is_translation || false,
            originalReportId: report.original_report_id,
            translatedTo: report.translated_to,
            detectedLanguage: report.detected_language,
            translatedAt: report.translated_at,
            sharedWith: report.shared_with || []
        };
    }
    
    convertFolderFromSupabase(folder) {
        return {
            id: folder.id.toString(),
            name: folder.name,
            color: folder.color || '#8B1538',
            createdAt: folder.created_at
        };
    }

    // === CONVERSION LOCAL → SUPABASE ===
    
    convertDraftToSupabase(draft) {
        const userId = this.getUserId();
        return {
            id: draft.id,
            user_id: userId,
            title: draft.title,
            generated_report: draft.generatedReport,
            created_at: draft.createdAt || new Date().toISOString(),
            source_type: draft.sourceType || 'recording',
            source_info: draft.sourceInfo,
            audio_url: draft.audioUrl,
            status: draft.status || 'generating',
            is_modified: draft.isModified || false
        };
    }
    
    convertReportToSupabase(report) {
        const userId = this.getUserId();
        return {
            id: report.id,  // ✅ CORRECTION CRITIQUE : Envoyer l'ID
            user_id: userId,
            title: report.title,
            content: report.content,
            validated_at: report.validatedAt || new Date().toISOString(),
            created_at: report.createdAt || new Date().toISOString(),
            folder_id: report.folderId || null,  // ✅ CORRECTION : TEXT, pas parseInt
            status: 'validated',
            source_type: report.sourceType || 'recording',
            source_info: report.sourceInfo,
            is_modified: report.isModified || false,
            has_pdf: report.hasPdf || false,
            pdf_generated: report.pdfGenerated || false,
            pdf_url: report.pdfUrl || null,
            pdf_data: report.pdfData || null,
            is_translation: report.isTranslation || false,
            original_report_id: report.originalReportId || null,
            translated_to: report.translatedTo || null,
            detected_language: report.detectedLanguage || null,
            translated_at: report.translatedAt || null,
            shared_with: report.sharedWith || []
        };
    }
    
    convertFolderToSupabase(folder) {
        const userId = this.getUserId();
        return {
            user_id: userId,
            name: folder.name,
            color: folder.color || '#8B1538',
            created_at: folder.createdAt || new Date().toISOString()
        };
    }

    // === UPLOAD PDF VERS SUPABASE STORAGE ===
    
    async uploadPdfToStorage(pdfData, filename) {
        if (!this.canUseSupabase()) {
            console.warn('⚠️ Supabase non disponible, PDF stocké en localStorage');
            return null;
        }
        
        try {
            console.log('📤 Upload PDF vers Supabase Storage...');
            
            const base64Data = pdfData.includes('base64,') 
                ? pdfData.split('base64,')[1] 
                : pdfData;
            
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const userId = this.getUserId();
            const timestamp = Date.now();
            const safeName = filename.replace(/[^a-z0-9_-]/gi, '_');
            const filePath = `${userId}/${timestamp}_${safeName}.pdf`;
            
            const { data, error } = await window.supabaseClient.storage
                .from('reports-pdf')
                .upload(filePath, blob, {
                    contentType: 'application/pdf',
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: urlData } = await window.supabaseClient.storage
                .from('reports-pdf')
                .createSignedUrl(filePath, 31536000);
            
            console.log('✅ PDF uploadé:', urlData.signedUrl);
            return urlData.signedUrl;
            
        } catch (error) {
            console.error('❌ Erreur upload PDF:', error);
            return null;
        }
    }

    // === GESTION DU STOCKAGE ===

    loadAppData() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                return {
                    brouillons: data.brouillons || [],
                    rapports: data.rapports || [],
                    folders: data.folders || []
                };
            }
        } catch (error) {
            console.error('Erreur lecture localStorage:', error);
        }
        return { brouillons: [], rapports: [], folders: [] };
    }

    saveAppData(data) {
        try {
            const dataToSave = {
                ...data,
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Erreur sauvegarde localStorage:', error);
            
            if (error.name === 'QuotaExceededError') {
                console.log('Tentative de nettoyage automatique...');
                this.cleanOldData(data);
            }
        }
    }

    cleanOldData(data) {
        try {
            const cleaned = {
                brouillons: data.brouillons ? data.brouillons.slice(0, this.maxBrouillons) : [],
                rapports: data.rapports ? data.rapports.slice(0, this.maxRapports) : [],
                folders: data.folders || [],
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(cleaned));
            console.log('Nettoyage automatique effectué');
            Utils.showToast(t('toast.users.updated'), 'info');
        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
        }
    }

    // === GESTION DES BROUILLONS ===

    getBrouillons() {
        const data = this.loadAppData();
        return data.brouillons || [];
    }

    async addBrouillon(brouillon) {
        const data = this.loadAppData();
        data.brouillons = data.brouillons || [];
        data.brouillons.unshift(brouillon);
        
        this.saveAppData(data);
        this.updateBrouillonsUI(data.brouillons);
        
        if (this.canUseSupabase()) {
            try {
                const supabaseDraft = this.convertDraftToSupabase(brouillon);
                const { error } = await window.supabaseClient
                    .from('drafts')
                    .insert([supabaseDraft]);
                
                if (error) throw error;
                console.log('✅ Brouillon sauvegardé dans Supabase');
            } catch (error) {
                console.error('❌ Erreur sauvegarde brouillon Supabase:', error);
            }
        }
    }

    async updateBrouillonWithReport(brouillonId, reportContent) {
        const data = this.loadAppData();
        const brouillon = data.brouillons.find(b => b.id === brouillonId);
        
        if (brouillon) {
            brouillon.generatedReport = reportContent;
            brouillon.status = 'ready';
            brouillon.title = this.extractTitleFromContent(reportContent);
            
            this.saveAppData(data);
            this.updateBrouillonsUI(data.brouillons);
            
            if (this.canUseSupabase()) {
                try {
                    const { error } = await window.supabaseClient
                        .from('drafts')
                        .update({
                            generated_report: reportContent,
                            status: 'ready',
                            title: brouillon.title
                        })
                        .eq('id', brouillonId);
                    
                    if (error) throw error;
                    console.log('✅ Brouillon mis à jour dans Supabase');
                } catch (error) {
                    console.error('❌ Erreur mise à jour brouillon:', error);
                }
            }
        }
    }

    async updateBrouillonStatus(brouillonId, status) {
        const data = this.loadAppData();
        const brouillon = data.brouillons.find(b => b.id === brouillonId);
        
        if (brouillon) {
            brouillon.status = status;
            if (status === 'error') {
                brouillon.title = t('drafts.status.error');
            }
            
            this.saveAppData(data);
            this.updateBrouillonsUI(data.brouillons);
            
            if (this.canUseSupabase()) {
                try {
                    const { error } = await window.supabaseClient
                        .from('drafts')
                        .update({ status, title: brouillon.title })
                        .eq('id', brouillonId);
                    
                    if (error) throw error;
                } catch (error) {
                    console.error('❌ Erreur mise à jour status:', error);
                }
            }
        }
    }

    async deleteBrouillon(brouillonId) {
        const data = this.loadAppData();
        data.brouillons = data.brouillons.filter(b => b.id !== brouillonId);
        
        this.saveAppData(data);
        this.updateBrouillonsUI(data.brouillons);
        Utils.showToast(t('toast.draft.deleted'), 'success');
        
        if (this.canUseSupabase()) {
            try {
                const { error } = await window.supabaseClient
                    .from('drafts')
                    .delete()
                    .eq('id', brouillonId);
                
                if (error) throw error;
                console.log('✅ Brouillon supprimé de Supabase');
            } catch (error) {
                console.error('❌ Erreur suppression brouillon:', error);
            }
        }
    }

    editBrouillon(brouillonId) {
        const data = this.loadAppData();
        const brouillon = data.brouillons.find(b => b.id === brouillonId);
        
        if (brouillon) {
            const modal = Utils.createModal(
                window.t('modal.edit.title'),
                `
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                        ${window.t('modal.edit.report.title')}
                    </label>
                    <input type="text" id="editTitle" class="modal-input" value="${Utils.escapeHtml(brouillon.title || 'Nouveau rapport')}">

                    <label style="display: block; margin-bottom: 10px; font-weight: bold; margin-top: 20px;">
                        ${window.t('modal.edit.content')}
                    </label>
                    <textarea id="editContent" class="modal-textarea">${Utils.escapeHtml(brouillon.generatedReport || '')}</textarea>
                `,
                []
            );

            const footer = modal.querySelector('.modal-footer');
            footer.innerHTML = '';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = window.t('btn.cancel');
            cancelBtn.addEventListener('click', () => {
                console.log('🔴 Édition annulée');
                modal.remove();
            });

            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn-primary';
            saveBtn.textContent = '💾 ' + window.t('btn.save');
            saveBtn.addEventListener('click', () => {
                console.log('✅ Sauvegarde du brouillon');
                this.saveEditedBrouillon(brouillonId, saveBtn);
            });
            
            footer.appendChild(cancelBtn);
            footer.appendChild(saveBtn);
        }
    }

    async saveEditedBrouillon(brouillonId, buttonElement) {
        const modal = buttonElement.closest('[data-modal]');
        const newTitle = modal.querySelector('#editTitle').value.trim();
        const newContent = modal.querySelector('#editContent').value.trim();
        
        if (!newTitle || !newContent) {
            Utils.showToast('Le titre et le contenu ne peuvent pas être vides', 'error');
            return;
        }
        
        const data = this.loadAppData();
        const brouillon = data.brouillons.find(b => b.id === brouillonId);
        
        if (brouillon) {
            brouillon.title = newTitle;
            brouillon.generatedReport = newContent;
            brouillon.isModified = true;
            
            this.saveAppData(data);
            this.updateBrouillonsUI(data.brouillons);
            
            modal.remove();
            Utils.showToast(window.t('msg.draft.saved'), 'success');
            
            if (this.canUseSupabase()) {
                try {
                    const { error } = await window.supabaseClient
                        .from('drafts')
                        .update({
                            title: newTitle,
                            generated_report: newContent,
                            is_modified: true
                        })
                        .eq('id', brouillonId);
                    
                    if (error) throw error;
                    console.log('✅ Brouillon édité dans Supabase');
                } catch (error) {
                    console.error('❌ Erreur édition brouillon:', error);
                }
            }
        }
    }

    async validateBrouillon(brouillonId) {
    const data = this.loadAppData();
    const folders = data.folders || [];

    if (folders.length > 0) {
        const foldersOptions = [
            `<option value="">${t('folder.none')}</option>`,
            ...folders.map(folder =>
                `<option value="${folder.id}">📁 ${Utils.escapeHtml(folder.name)}</option>`
            )
        ].join('');

        const modal = Utils.createModal(
            t('modal.validate.title'),
            `
                <p style="margin-bottom: 20px;">${t('modal.validate.description')}</p>
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                    ${t('modal.validate.folder.label')}
                </label>
                <select id="validateFolderSelect" class="modal-input" style="cursor: pointer;">
                    ${foldersOptions}
                </select>
            `,
            []
        );

        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = t('btn.cancel');
        cancelBtn.addEventListener('click', () => {
            console.log('🔴 Validation annulée');
            modal.remove();
        });

        const validateBtn = document.createElement('button');
        validateBtn.className = 'btn-primary';
        validateBtn.textContent = `✅ ${t('modal.validate.button')}`;
        validateBtn.addEventListener('click', () => {
            console.log('✅ Validation confirmée');
            const select = modal.querySelector('#validateFolderSelect');
            const selectedFolderId = select.value || null;
            
            console.log('📂 Dossier sélectionné dans le modal:', selectedFolderId);
            
            modal.remove();
            
            console.log('🚀 Appel de confirmValidateBrouillon avec ID:', brouillonId);
            this.confirmValidateBrouillon(brouillonId, selectedFolderId);
        });
        
        footer.appendChild(cancelBtn);
        footer.appendChild(validateBtn);
        
    } else {
        console.log('📁 Aucun dossier disponible, validation directe');
        this.confirmValidateBrouillon(brouillonId);
    }
}

async confirmValidateBrouillon(brouillonId, selectedFolderId = null) {
    const data = this.loadAppData();
    const brouillonIndex = data.brouillons.findIndex(b => b.id === brouillonId);
    
    if (brouillonIndex !== -1) {
        const brouillon = data.brouillons[brouillonIndex];
        
        const rapport = {
            id: Utils.generateId('rapport_'),
            title: brouillon.title || `Nouveau rapport - ${new Date().toLocaleDateString()}`,
            content: brouillon.generatedReport,
            validatedAt: new Date().toISOString(),
            createdAt: brouillon.createdAt,
            folderId: selectedFolderId,
            sharedWith: [],
            status: 'validated',
            isModified: brouillon.isModified,
            sourceType: brouillon.sourceType,
            sourceInfo: brouillon.sourceInfo,
            hasPdf: false,
            pdfGenerated: false,
            pdfUrl: null
        };

        console.log('🔵 ========== DÉBUT VALIDATION BROUILLON ==========');
        console.log('📄 Rapport LOCAL créé:', rapport);
        console.log('📂 Dossier sélectionné (folderId):', selectedFolderId);
        console.log('🆔 ID du rapport:', rapport.id);

        try {
            Utils.showToast('Génération du PDF...', 'info');
            const pdf = await Utils.generatePDF(rapport.title, rapport.content);
            
            if (this.canUseSupabase()) {
                const pdfUrl = await this.uploadPdfToStorage(
                    pdf.output('datauristring'), 
                    rapport.title
                );
                
                if (pdfUrl) {
                    rapport.pdfUrl = pdfUrl;
                    rapport.hasPdf = true;
                    rapport.pdfGenerated = true;
                    console.log('✅ PDF uploadé vers Supabase Storage');
                } else {
                    rapport.pdfData = pdf.output('datauristring');
                    rapport.hasPdf = true;
                    rapport.pdfGenerated = true;
                }
            } else {
                rapport.pdfData = pdf.output('datauristring');
                rapport.hasPdf = true;
                rapport.pdfGenerated = true;
            }
            
            Utils.showToast('PDF généré avec succès', 'success');
        } catch (error) {
            console.error('Erreur génération PDF:', error);
            Utils.showToast('Erreur lors de la génération du PDF', 'error');
        }

        data.rapports = data.rapports || [];
        data.rapports.unshift(rapport);
        data.brouillons.splice(brouillonIndex, 1);
        
        this.saveAppData(data);
        this.updateBrouillonsUI(data.brouillons);
        this.updateRapportsUI(data.rapports);
        
        Utils.showToast(window.t('msg.draft.validated'), 'success');
        
        if (this.canUseSupabase()) {
            try {
                const userId = this.getUserId();
                const currentUser = window.appManager?.getCurrentUser();
                
                console.log('🔄 Conversion rapport pour Supabase...');
                const supabaseReport = this.convertReportToSupabase(rapport);
                
                console.log('📤 Rapport CONVERTI pour Supabase:', supabaseReport);
                console.log('🔍 Vérifications:');
                console.log('   - id:', supabaseReport.id, '(type:', typeof supabaseReport.id, ')');
                console.log('   - folder_id:', supabaseReport.folder_id, '(type:', typeof supabaseReport.folder_id, ')');
                console.log('   - user_id:', supabaseReport.user_id, '(type:', typeof supabaseReport.user_id, ')');
                
                console.log('🚀 Appel Supabase INSERT...');
                const { data: insertedReport, error: reportError } = await window.supabaseClient
                    .from('reports')
                    .insert([supabaseReport])
                    .select()
                    .single();
                
                console.log('📬 Résultat INSERT Supabase:', {
                    data: insertedReport,
                    error: reportError
                });
                
                if (reportError) {
                    console.error('❌❌❌ ERREUR INSERT:', reportError);
                    console.error('Code:', reportError.code);
                    console.error('Message:', reportError.message);
                    console.error('Details:', reportError.details);
                    throw reportError;
                }
                
                console.log('✅✅✅ Rapport sauvegardé dans Supabase:', insertedReport.id);
                
                await window.supabaseClient
                    .from('drafts')
                    .delete()
                    .eq('id', brouillonId);
                
                if (currentUser && currentUser.subscription_plan === 'free') {
                    // ✅ Incrémenter le compteur en mémoire (lecture locale rapide)
                    const newCount = (currentUser.reports_this_month || 0) + 1;
                    currentUser.reports_this_month = newCount;
                    
                    console.log(`✅ Compteur mis à jour en mémoire: ${newCount}/5`);
                    
                    // Mettre à jour aussi dans Supabase (en arrière-plan)
                    try {
                        await window.supabaseClient
                            .from('profiles')
                            .update({ reports_this_month: newCount })
                            .eq('id', userId);
                        
                        console.log(`✅ Compteur synchronisé avec Supabase: ${newCount}/5`);
                    } catch (updateError) {
                        console.error('⚠️ Erreur sync compteur Supabase:', updateError);
                        // Pas grave, on continue avec la valeur en mémoire
                    }
                }
            } catch (error) {
                console.error('❌ Erreur sauvegarde rapport Supabase:', error);
            }
        } else {
            console.warn('⚠️ Supabase non disponible - Sauvegarde locale uniquement');
        }
        
        console.log('🔵 ========== FIN VALIDATION BROUILLON ==========');
    }
}

    // === GESTION DES RAPPORTS ===

    getRapports() {
        const data = this.loadAppData();
        return data.rapports || [];
    }

    // === GESTION DES DOSSIERS ===

    getFolders() {
        const data = this.loadAppData();
        return data.folders || [];
    }

    async createFolder(folderName) {
        if (!folderName || !folderName.trim()) {
            Utils.showToast('Le nom du dossier ne peut pas être vide', 'error');
            return null;
        }

        console.log('🔍 Vérification du plan pour création de dossier...');
        
        const userPlan = await Utils.checkUserPlan();
        
        console.log('📊 Plan utilisateur:', userPlan);
        
        if (userPlan !== 'pro') {
            console.log('🚫 BLOCAGE - Plan FREE: Dossiers réservés au PRO');

            Utils.showUpgradeModal(
                t('modal.pro.title'),
                t('modal.pro.description'),
                'folders'
            );

            return null;
        }
        
        console.log('✅ Plan PRO confirmé - Création de dossier autorisée');

        const data = this.loadAppData();
        data.folders = data.folders || [];

        if (data.folders.find(f => f.name.toLowerCase() === folderName.toLowerCase())) {
            Utils.showToast(t('folder.error.exists'), 'error');
            return null;
        }

        const folder = {
            id: Utils.generateId('folder_'),
            name: folderName.trim(),
            createdAt: new Date().toISOString(),
            color: this.getRandomFolderColor()
        };

        data.folders.push(folder);
        this.saveAppData(data);
        
        Utils.showToast(`Dossier "${folderName}" créé`, 'success');
        
        if (this.canUseSupabase()) {
            try {
                const supabaseFolder = this.convertFolderToSupabase(folder);
                const { data: insertedFolder, error } = await window.supabaseClient
                    .from('folders')
                    .insert([supabaseFolder])
                    .select()
                    .single();
                
                if (error) throw error;
                
                folder.id = insertedFolder.id.toString();
                data.folders[data.folders.length - 1] = folder;
                this.saveAppData(data);
                
                console.log('✅ Dossier sauvegardé dans Supabase:', insertedFolder.id);
            } catch (error) {
                console.error('❌ Erreur création dossier Supabase:', error);
            }
        }
        
        return folder;
    }

    async deleteFolder(folderId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier ? Les rapports seront déplacés vers "Aucun dossier".')) {
            return;
        }

        const data = this.loadAppData();
        
        if (data.rapports) {
            data.rapports.forEach(rapport => {
                if (rapport.folderId === folderId) {
                    rapport.folderId = null;
                }
            });
        }

        data.folders = data.folders.filter(f => f.id !== folderId);
        this.saveAppData(data);
        
        if (this.currentFolderId === folderId) {
            this.closeFolder();
        } else {
            this.updateRapportsUI(data.rapports);
        }
        
        Utils.showToast(window.t('msg.folder.deleted'), 'success');
        
        if (this.canUseSupabase()) {
            try {
                await window.supabaseClient
                    .from('reports')
                    .update({ folder_id: null })
                    .eq('folder_id', folderId);
                
                const { error } = await window.supabaseClient
                    .from('folders')
                    .delete()
                    .eq('id', parseInt(folderId));
                
                if (error) throw error;
                console.log('✅ Dossier supprimé de Supabase');
            } catch (error) {
                console.error('❌ Erreur suppression dossier:', error);
            }
        }
    }

    getRandomFolderColor() {
        const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    getReportsCountText(count) {
        if (count === 0) {
            return '0 rapport';
        } else if (count === 1) {
            return '1 rapport';
        } else {
            return `${count} rapports`;
        }
    }

    openFolder(folderId) {
        this.currentFolderId = folderId;
        const data = this.loadAppData();
        this.updateRapportsUI(data.rapports);
    }

    closeFolder() {
        this.currentFolderId = null;
        const data = this.loadAppData();
        this.updateRapportsUI(data.rapports);
    }

    renameFolder(folderId) {
        const data = this.loadAppData();
        const folder = data.folders.find(f => f.id === folderId);
        
        if (!folder) return;

        const modal = Utils.createModal(
            'Renommer le dossier',
            `
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                    Nouveau nom :
                </label>
                <input type="text" id="folderNameInput" class="modal-input" value="${Utils.escapeHtml(folder.name)}" placeholder="Nom du dossier">
            `,
            []
        );
        
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = window.t('btn.cancel');
        cancelBtn.addEventListener('click', () => {
            console.log('🔴 Renommage annulé');
            modal.remove();
        });

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = '💾 ' + window.t('btn.save');
        saveBtn.addEventListener('click', () => {
            console.log('✅ Renommage confirmé');
            this.saveFolderRename(folderId, saveBtn);
        });
        
        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);
    }

    async saveFolderRename(folderId, buttonElement) {
        const modal = buttonElement.closest('[data-modal]');
        const newName = modal.querySelector('#folderNameInput').value.trim();
        
        if (!newName) {
            Utils.showToast('Le nom du dossier ne peut pas être vide', 'error');
            return;
        }

        const data = this.loadAppData();
        const folder = data.folders.find(f => f.id === folderId);
        
        if (folder) {
            folder.name = newName;
            this.saveAppData(data);
            this.updateRapportsUI(data.rapports);
            modal.remove();
            Utils.showToast('Dossier renommé', 'success');
            
            if (this.canUseSupabase()) {
                try {
                    const { error } = await window.supabaseClient
                        .from('folders')
                        .update({ name: newName })
                        .eq('id', parseInt(folderId));
                    
                    if (error) throw error;
                    console.log('✅ Dossier renommé dans Supabase');
                } catch (error) {
                    console.error('❌ Erreur renommage dossier:', error);
                }
            }
        }
    }

    async moveRapportToFolder(rapportId, newFolderId) {
    const data = this.loadAppData();
    const rapport = data.rapports.find(r => r.id === rapportId);
    
    if (rapport) {
        rapport.folderId = newFolderId;
        this.saveAppData(data);
        this.updateRapportsUI(data.rapports);
        
        const folderName = newFolderId ? data.folders.find(f => f.id === newFolderId)?.name : 'Aucun dossier';
        Utils.showToast(`Rapport déplacé vers "${folderName}"`, 'success');
        
        if (this.canUseSupabase()) {
            try {
                console.log('🔵 ===== DÉBUT DÉPLACEMENT =====');
                console.log('📄 Rapport ID:', rapportId);
                console.log('📂 Nouveau dossier ID:', newFolderId);
                
                const { data: updateResult, error } = await window.supabaseClient
                    .from('reports')
                    .update({ folder_id: newFolderId || null })  // ✅ TEXT ou NULL
                    .eq('id', rapportId)
                    .select();  // ✅ AJOUT pour voir le résultat
                
                console.log('📬 Résultat UPDATE:', { data: updateResult, error });
                
                if (error) {
                    console.error('❌ ERREUR UPDATE:', error);
                    throw error;
                }
                
                console.log('✅ Rapport déplacé dans Supabase');
                console.log('🔵 ===== FIN DÉPLACEMENT =====');
                
            } catch (error) {
                console.error('❌ Erreur déplacement rapport:', error);
            }
        }
    }
}

    // === FONCTION SUPPRESSION DE RAPPORT (VERSION FRANCE) ===
    
    async deleteRapport(rapportId) {
        console.log('🗑️ Suppression rapport:', rapportId);
        
        // Récupérer le rapport avant suppression (pour avoir le pdfUrl)
        const rapport = this.getRapport(rapportId);
        if (!rapport) {
            Utils.showToast('Rapport introuvable', 'error');
            return false;
        }
        
        // Demander confirmation
        const confirmed = await this.showDeleteConfirmation(rapport.title);
        if (!confirmed) {
            console.log('❌ Suppression annulée par l\'utilisateur');
            return false;
        }
        
        try {
            // 1. Suppression du localStorage
            const data = this.loadAppData();
            data.rapports = data.rapports.filter(r => r.id !== rapportId);
            this.saveAppData(data);
            console.log('✅ Rapport supprimé du localStorage');
            
            // 2. Suppression de Supabase (table reports)
            if (this.canUseSupabase()) {
    console.log('🔄 Tentative suppression Supabase...');
    console.log('   User ID:', this.getUserId());
    console.log('   Rapport ID:', rapportId);
    
    // ✅ AJOUT CRITIQUE : .select() pour voir ce qui a été supprimé
    const { data: deletedData, error: deleteError } = await window.supabaseClient
        .from('reports')
        .delete()
        .eq('id', rapportId)
        .select();  // ← LIGNE CRITIQUE AJOUTÉE
    
    console.log('📬 Résultat DELETE:', {
        deletedData,
        deleteError,
        rowsDeleted: deletedData?.length || 0
    });
    
    if (deleteError) {
        console.error('❌ Erreur DELETE Supabase:', deleteError);
        Utils.showToast('⚠️ Erreur suppression Supabase: ' + deleteError.message, 'warning');
    } else if (!deletedData || deletedData.length === 0) {
        console.warn('⚠️⚠️⚠️ PROBLÈME : Aucune ligne supprimée !');
        
        // Vérifier si le rapport existe
        const { data: existing } = await window.supabaseClient
            .from('reports')
            .select('id, user_id, title')
            .eq('id', rapportId)
            .single();
        
        if (existing) {
            console.error('🚨 PROBLÈME RLS : Le rapport EXISTE mais ne peut pas être supprimé');
            console.error('   Rapport user_id:', existing.user_id);
            console.error('   Current user_id:', this.getUserId());
            Utils.showToast('⚠️ Problème de permissions Supabase (RLS)', 'error');
        } else {
            console.log('ℹ️ Le rapport n\'existe pas dans Supabase');
        }
    } else {
        console.log('✅✅✅ Rapport supprimé de Supabase:', deletedData[0]);
    }
                
                // 3. Suppression du PDF dans Supabase Storage (si existe)
                if (rapport.pdfUrl) {
                    try {
                        // Extraire le chemin du fichier depuis l'URL signée
                        const userId = this.getUserId();
                        const urlParts = rapport.pdfUrl.split('/');
                        const fileNameWithParams = urlParts[urlParts.length - 1];
                        const fileName = fileNameWithParams.split('?')[0]; // Retirer les query params
                        const filePath = `${userId}/${fileName}`;
                        
                        const { error: storageError } = await window.supabaseClient.storage
                            .from('vocalia-files')
                            .remove([filePath]);
                        
                        if (storageError) {
                            console.error('⚠️ Erreur suppression PDF Storage:', storageError);
                        } else {
                            console.log('✅ PDF supprimé du Storage');
                        }
                    } catch (storageErr) {
                        console.error('⚠️ Erreur lors de la suppression du PDF:', storageErr);
                    }
                }
            }
            
            // 4. Mettre à jour l'UI en rechargeant les données
            const updatedData = this.loadAppData();
            this.updateRapportsUI(updatedData.rapports);
            
            // 5. Afficher confirmation
            Utils.showToast('✅ Rapport supprimé avec succès', 'success');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur lors de la suppression:', error);
            Utils.showToast('Erreur lors de la suppression du rapport', 'error');
            return false;
        }
    }
    
    // Modal de confirmation de suppression
    showDeleteConfirmation(rapportTitle) {
        return new Promise((resolve) => {
            const modal = Utils.createModal(
                'Confirmer la suppression',
                `
                <div style="text-align: center; padding: 20px 0;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🗑️</div>
                    <p style="font-size: 16px; color: var(--gray-700); margin-bottom: 10px;">
                        Voulez-vous vraiment supprimer ce rapport ?
                    </p>
                    <p style="font-size: 14px; font-weight: 600; color: var(--gray-900); margin-bottom: 20px;">
                        "${Utils.escapeHtml(rapportTitle)}"
                    </p>
                    <p style="font-size: 13px; color: #ef4444; font-weight: 500;">
                        ⚠️ Cette action est irréversible
                    </p>
                </div>
                `,
                []
            );
            
            const footer = modal.querySelector('.modal-footer');
            footer.innerHTML = '';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = 'Annuler';
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-primary';
            deleteBtn.style.background = '#ef4444';
            deleteBtn.textContent = '🗑️ Supprimer';
            deleteBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
            
            footer.appendChild(cancelBtn);
            footer.appendChild(deleteBtn);
        });
    }

    getRapport(rapportId) {
        const data = this.loadAppData();
        return data.rapports.find(r => r.id === rapportId);
    }

    showCreateFolderModal() {
        const modal = Utils.createModal(
            window.t('folder.create.title'),
            `
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                    ${window.t('folder.name.label')}
                </label>
                <input type="text" id="newFolderName" class="modal-input" placeholder="${window.t('folder.name.placeholder')}" autofocus>
            `,
            []
        );
        
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = window.t('btn.cancel');
        cancelBtn.addEventListener('click', () => {
            console.log('🔴 Création de dossier annulée');
            modal.remove();
        });
        
        const createBtn = document.createElement('button');
        createBtn.className = 'btn-primary';
        createBtn.textContent = window.t('folder.create.button');
        createBtn.addEventListener('click', () => {
            console.log('✅ Création de dossier confirmée');
            this.handleCreateFolder(createBtn);
        });
        
        footer.appendChild(cancelBtn);
        footer.appendChild(createBtn);

        const input = modal.querySelector('#newFolderName');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleCreateFolder(createBtn);
            }
        });
    }

    async handleCreateFolder(element) {
        const modal = element.closest('[data-modal]');
        const input = modal.querySelector('#newFolderName');
        const folderName = input.value.trim();

        // ✅ CORRECTION : Attendre la création du dossier
        const newFolder = await this.createFolder(folderName);
        
        if (newFolder) {
            modal.remove();
            // ✅ CORRECTION : Recharger l'UI pour afficher le nouveau dossier
            const data = this.loadAppData();
            this.updateRapportsUI(data.rapports);
        }
    }

    showMoveFolderModal(rapportId) {
        const data = this.loadAppData();
        const folders = data.folders || [];
        const rapport = data.rapports.find(r => r.id === rapportId);

        const foldersOptions = [
            `<option value="">${t('folder.none')}</option>`,
            ...folders.map(folder =>
                `<option value="${folder.id}" ${rapport.folderId === folder.id ? 'selected' : ''}>
                    📁 ${Utils.escapeHtml(folder.name)}
                </option>`
            )
        ].join('');

        const modal = Utils.createModal(
            t('modal.move.title'),
            `
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                    ${t('modal.move.choose')}
                </label>
                <select id="folderSelect" class="modal-input" style="cursor: pointer;">
                    ${foldersOptions}
                </select>
            `,
            []
        );

        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = t('btn.cancel');
        cancelBtn.addEventListener('click', () => {
            console.log('🔴 Déplacement annulé');
            modal.remove();
        });

        const moveBtn = document.createElement('button');
        moveBtn.className = 'btn-primary';
        moveBtn.textContent = `📂 ${t('modal.move.button')}`;
        moveBtn.addEventListener('click', () => {
            console.log('✅ Déplacement confirmé');
            this.handleMoveRapport(rapportId, moveBtn);
        });
        
        footer.appendChild(cancelBtn);
        footer.appendChild(moveBtn);
    }

    handleMoveRapport(rapportId, buttonElement) {
        const modal = buttonElement.closest('[data-modal]');
        const select = modal.querySelector('#folderSelect');
        const folderId = select.value || null;

        this.moveRapportToFolder(rapportId, folderId);
        modal.remove();
    }

    async downloadPDF(rapportId) {
        const data = this.loadAppData();
        const rapport = data.rapports.find(r => r.id === rapportId);
        
        if (!rapport) return;
        
        if (rapport.pdfUrl) {
            try {
                Utils.showToast('Téléchargement du PDF...', 'info');
                
                const link = document.createElement('a');
                link.href = rapport.pdfUrl;
                link.download = `${rapport.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
                link.target = '_blank';
                link.click();
                
                Utils.showToast('PDF téléchargé', 'success');
                return;
            } catch (error) {
                console.error('❌ Erreur téléchargement PDF:', error);
            }
        }
        
        if (rapport.pdfData) {
            const byteCharacters = atob(rapport.pdfData.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const filename = `${rapport.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            Utils.downloadFile(blob, filename);
            Utils.showToast('PDF téléchargé', 'success');
        } else {
            Utils.showToast('PDF non disponible', 'error');
        }
    }

    async shareRapport(rapportId) {
        const data = this.loadAppData();
        const rapport = data.rapports.find(r => r.id === rapportId);
        
        if (!rapport) return;
        
        if (rapport.pdfUrl) {
            try {
                if (navigator.share) {
                    await navigator.share({
                        title: rapport.title,
                        text: `Nouveau rapport: ${rapport.title}`,
                        url: rapport.pdfUrl
                    });
                    Utils.showToast('Rapport partagé', 'success');
                    return;
                } else {
                    await Utils.copyToClipboard(rapport.pdfUrl);
                    Utils.showToast('Lien PDF copié dans le presse-papier', 'success');
                    return;
                }
            } catch (error) {
                console.error('Erreur partage PDF:', error);
            }
        }
        
        this.shareRapportAsText(rapport);
    }

    async shareRapportAsText(rapport) {
        const shareText = `${rapport.title}\n\n${rapport.content}`;
        
        const shared = await Utils.shareContent(rapport.title, shareText);
        
        if (!shared) {
            const copied = await Utils.copyToClipboard(shareText);
            if (copied) {
                Utils.showToast('Rapport copié dans le presse-papier', 'success');
            } else {
                Utils.showToast('Erreur lors du partage', 'error');
            }
        }
    }

    // NOTE: Les fonctions translateRapport, viewRapport, updateBrouillonsUI, updateRapportsUI, etc.
    // restent identiques à celles que tu avais déjà, je les omets ici pour gagner de l'espace.
    // Garde-les telles quelles dans ton fichier actuel.

    loadBrouillonsData() {
        const brouillons = this.getBrouillons();
        this.updateBrouillonsUI(brouillons);
    }

    loadRapportsData() {
        const rapports = this.getRapports();
        this.updateRapportsUI(rapports);
    }

    extractTitleFromContent(content) {
        if (!content) return 'Rapport sans titre';
        
        const patterns = [
            /titre\s*[:=]\s*([^\n\r]+)/i,
            /title\s*[:=]\s*([^\n\r]+)/i,
            /client\s*[:=]\s*([^\n\r]+)/i,
            /^([^\n\r]{10,80})/
        ];
        
        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                return match[1].trim().replace(/^[#\-*=\s]+|[#\-*=\s]+$/g, '');
            }
        }
        
        return 'Rapport sans titre';
    }

    filterRapports(searchTerm) {
        const data = this.loadAppData();
        const rapports = data.rapports || [];
        
        if (!searchTerm) {
            this.updateRapportsUI(rapports);
            return;
        }

        const filtered = rapports.filter(rapport => 
            rapport.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rapport.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.updateRapportsUI(filtered);
    }

    exportRapport(id) {
        this.downloadPDF(id);
    }

    
async translateRapport(rapportId) {
        const data = this.loadAppData();
        const rapport = data.rapports.find(r => r.id === rapportId);
        
        if (!rapport) return;

        console.log('🔍 Vérification du plan pour traduction...');
        
        const userPlan = await Utils.checkUserPlan();
        
        console.log('📊 Plan utilisateur:', userPlan);
        
        if (userPlan !== 'pro') {
            console.log('🚫 BLOCAGE - Plan FREE: Traduction réservée au PRO');
            
            Utils.showUpgradeModal(
                '🌍 Traduction réservée au plan PRO',
                'Traduisez instantanément vos rapports en <strong>6 langues</strong> :<br>🇫🇷 Français • 🇬🇧 Anglais • 🇨🇳 Chinois • 🇯🇵 Japonais • 🇪🇸 Espagnol • 🇩🇪 Allemand',
                'translation'
            );
            
            return;
        }
        
        console.log('✅ Plan PRO confirmé - Traduction autorisée');

        let sourceRapport = rapport;
        if (rapport.isTranslation && rapport.originalReportId) {
            sourceRapport = data.rapports.find(r => r.id === rapport.originalReportId) || rapport;
        }
        
        const modal = Utils.createModal(
            'Traduire le rapport',
            `
                <div style="margin-bottom: 20px; padding: 15px; background: var(--gray-50); border-radius: 10px;">
                    <p style="margin: 0 0 10px 0;"><strong>Rapport original :</strong></p>
                    <p style="color: var(--gray-600); font-size: 14px; margin: 0; font-weight: 600;">
                        ${Utils.escapeHtml(sourceRapport.title)}
                    </p>
                    <p style="color: var(--gray-500); font-size: 13px; margin-top: 8px;">
                        ${Utils.truncateText(sourceRapport.content, 200)}
                    </p>
                </div>
                
                <label style="display: block; margin-bottom: 10px; font-weight: bold; color: var(--gray-800);">
                    Langue cible :
                </label>
                <select id="targetLanguage" class="modal-input" style="cursor: pointer;">
                    <option value="en">🇬🇧 English</option>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="zh">🇨🇳 中文</option>
                    <option value="ja">🇯🇵 日本語</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="de">🇩🇪 Deutsch</option>
                </select>
                
                <div style="margin-top: 20px; padding: 15px; background: var(--primary-ultra-light); border-radius: 10px; border-left: 4px solid var(--primary);">
                    <p style="font-size: 13px; color: var(--gray-700); margin: 0; line-height: 1.6;">
                        <strong>ℹ️ Note:</strong> La traduction sera créée comme un nouveau rapport distinct.
                    </p>
                </div>
            `,
            []
        );
        
        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Annuler';
        cancelBtn.addEventListener('click', () => {
            console.log('🔴 Traduction annulée');
            modal.remove();
        });
        
        const translateBtn = document.createElement('button');
        translateBtn.className = 'btn-primary';
        translateBtn.textContent = '🌐 Traduire';
        translateBtn.addEventListener('click', () => {
            console.log('✅ Traduction confirmée');
            this.processTranslation(sourceRapport.id, translateBtn);
        });
        
        footer.appendChild(cancelBtn);
        footer.appendChild(translateBtn);
    }

    async processTranslation(rapportId, buttonElement) {
        const modal = buttonElement.closest('[data-modal]');
        const targetLang = modal.querySelector('#targetLanguage').value;
        
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<div class="loading-spinner" style="display: inline-block; width: 16px; height: 16px; margin-right: 8px;"></div> Traduction en cours...';
        
        const data = this.loadAppData();
        const rapport = data.rapports.find(r => r.id === rapportId);
        
        if (!rapport) {
            modal.remove();
            return;
        }
        
        try {
            console.log('=== DÉBUT TRADUCTION ===');
            
            const response = await fetch(CONFIG.N8N_TRANSLATE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportId: rapportId,
                    title: rapport.title,
                    content: rapport.content,
                    targetLanguage: targetLang,
                    userId: window.appManager?.getCurrentUser()?.id || 'unknown',
                    timestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error(`Erreur N8n: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error('La traduction a échoué côté serveur');
            }
            
            const translatedRapport = {
                id: Utils.generateId('rapport_translated_'),
                title: result.translatedTitle || `[${targetLang.toUpperCase()}] ${rapport.title}`,
                content: result.translatedContent || result.content,
                validatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                
                isTranslation: true,
                originalReportId: rapportId,
                detectedLanguage: result.detectedSourceLanguage || 'unknown',
                translatedTo: targetLang,
                translatedAt: new Date().toISOString(),
                
                folderId: rapport.folderId,
                
                hasPdf: false,
                pdfGenerated: false,
                pdfUrl: null
            };
            
            modal.remove();
            
            try {
                Utils.showToast('Génération du PDF...', 'info', 2000);
                const pdf = await Utils.generatePDF(translatedRapport.title, translatedRapport.content);
                
                if (this.canUseSupabase()) {
                    const pdfUrl = await this.uploadPdfToStorage(
                        pdf.output('datauristring'),
                        translatedRapport.title
                    );
                    
                    if (pdfUrl) {
                        translatedRapport.pdfUrl = pdfUrl;
                        translatedRapport.hasPdf = true;
                        translatedRapport.pdfGenerated = true;
                    } else {
                        translatedRapport.pdfData = pdf.output('datauristring');
                        translatedRapport.hasPdf = true;
                        translatedRapport.pdfGenerated = true;
                    }
                } else {
                    translatedRapport.pdfData = pdf.output('datauristring');
                    translatedRapport.hasPdf = true;
                    translatedRapport.pdfGenerated = true;
                }
            } catch (pdfError) {
                console.warn('Erreur génération PDF:', pdfError);
            }
            
            data.rapports.unshift(translatedRapport);
            this.saveAppData(data);
            this.updateRapportsUI(data.rapports);
            
            const langName = this.getLanguageName(targetLang);
            Utils.showToast(`Rapport traduit en ${langName}`, 'success');
            
            if (this.canUseSupabase()) {
                try {
                    const supabaseReport = this.convertReportToSupabase(translatedRapport);
                    const { error } = await window.supabaseClient
                        .from('reports')
                        .insert([supabaseReport]);
                    
                    if (error) throw error;
                    console.log('✅ Traduction sauvegardée dans Supabase');
                } catch (error) {
                    console.error('❌ Erreur sauvegarde traduction:', error);
                }
            }
            
            console.log('=== TRADUCTION TERMINÉE ===');
            
        } catch (error) {
            console.error('Erreur traduction:', error);
            modal.remove();
            Utils.showToast('Erreur lors de la traduction: ' + error.message, 'error');
        }
    }

    getLanguageName(code) {
        const languages = {
            'en': 'English',
            'fr': 'Français',
            'zh': '中文',
            'ja': '日本語',
            'es': 'Español',
            'de': 'Deutsch',
            'unknown': '?'
        };
        return languages[code] || code.toUpperCase();
    }

    viewRapport(rapportId) {
        const data = this.loadAppData();
        const rapport = data.rapports.find(r => r.id === rapportId);

        if (!rapport) return;

        const validatedDate = Utils.formatDate(rapport.validatedAt);
        const modifiedWarning = rapport.isModified ? `<br><em>⚠️ ${t('modal.report.modified')}</em>` : '';
        const pdfAvailable = rapport.hasPdf ? `<br><strong>📄 ${t('modal.report.pdf_available')}</strong>` : '';

        let translationInfo = '';
        if (rapport.isTranslation) {
            translationInfo = `
                <div style="
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05));
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                    border-left: 3px solid #8b5cf6;
                ">
                    <strong>🌐 ${t('modal.report.translation')}</strong> : ${this.getLanguageName(rapport.translatedTo)}
                    ${rapport.originalReportId ? `<br><small>${t('modal.report.original_available')}</small>` : ''}
                </div>
            `;
        }

        const modal = Utils.createModal(
            `📋 ${rapport.title}`,
            `
                <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 14px; color: #666;">
                    <strong>${t('modal.report.validated_on')}</strong> ${validatedDate}
                    ${modifiedWarning}
                    ${pdfAvailable}
                </div>
                ${translationInfo}
                <div style="line-height: 1.6; font-size: 15px; white-space: pre-wrap;">
                    ${Utils.escapeHtml(rapport.content)}
                </div>
            `,
            []
        );

        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';

        if (rapport.isTranslation && rapport.originalReportId) {
            const original = data.rapports.find(r => r.id === rapport.originalReportId);
            if (original) {
                const compareBtn = document.createElement('button');
                compareBtn.className = 'btn-primary';
                compareBtn.textContent = `🔄 ${t('btn.compare')}`;
                compareBtn.addEventListener('click', () => {
                    modal.remove();
                    this.viewComparison(original.id, rapport.id);
                });
                footer.appendChild(compareBtn);
            }
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn-secondary';
        closeBtn.textContent = t('btn.close');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        footer.appendChild(closeBtn);
    }

    viewComparison(originalId, translatedId) {
        const data = this.loadAppData();
        const original = data.rapports.find(r => r.id === originalId);
        const translated = data.rapports.find(r => r.id === translatedId);

        if (!original || !translated) return;

        const modal = Utils.createModal(
            `🌐 ${t('modal.comparison.title')} - ${translated.title}`,
            `
                <div class="report-comparison-layout">

                    <div class="report-comparison-column report-original">
                        <div class="report-comparison-header original-header">
                            <h4>
                                📄 ${t('modal.comparison.original')}
                                <span class="language-badge">
                                    ${this.getLanguageName(original.detectedLanguage || translated.detectedLanguage)}
                                </span>
                            </h4>
                        </div>
                        <h3 class="report-comparison-title">${Utils.escapeHtml(original.title)}</h3>
                        <div class="report-comparison-content">
                            ${Utils.escapeHtml(original.content)}
                        </div>
                    </div>

                    <div class="report-comparison-column report-translated">
                        <div class="report-comparison-header translated-header">
                            <h4>
                                🌐 ${t('modal.comparison.translation')}
                                <span class="language-badge translated-badge">
                                    ${this.getLanguageName(translated.translatedTo)}
                                </span>
                            </h4>
                        </div>
                        <h3 class="report-comparison-title">${Utils.escapeHtml(translated.title)}</h3>
                        <div class="report-comparison-content">
                            ${Utils.escapeHtml(translated.content)}
                        </div>
                    </div>

                </div>
            `,
            []
        );

        const footer = modal.querySelector('.modal-footer');
        footer.innerHTML = '';

        const pdfOriginalBtn = document.createElement('button');
        pdfOriginalBtn.className = 'btn-secondary';
        pdfOriginalBtn.textContent = `📄 ${t('modal.comparison.pdf_original')}`;
        pdfOriginalBtn.addEventListener('click', () => {
            this.downloadPDF(original.id);
            modal.remove();
        });

        const pdfTranslatedBtn = document.createElement('button');
        pdfTranslatedBtn.className = 'btn-primary';
        pdfTranslatedBtn.textContent = `📄 ${t('modal.comparison.pdf_translated')}`;
        pdfTranslatedBtn.addEventListener('click', () => {
            this.downloadPDF(translated.id);
            modal.remove();
        });

        footer.appendChild(pdfOriginalBtn);
        footer.appendChild(pdfTranslatedBtn);
    }

    // === AFFICHAGE DES BROUILLONS ===
    
    updateBrouillonsUI(brouillons) {
        const container = document.getElementById('brouillonsList');
        if (!container) return;

        if (!brouillons || brouillons.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📄</div>
                    <p>${t('drafts.empty')}</p>
                    <p class="empty-subtitle">${t('drafts.empty.subtitle')}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = brouillons.map(brouillon => {
            const date = Utils.formatDate(brouillon.createdAt);
            let statusClass = '';
            let statusIcon = '📄';

            if (brouillon.status === 'generating') {
                statusClass = 'status-generating';
                statusIcon = '⏳';
            } else if (brouillon.status === 'error') {
                statusClass = 'status-error';
                statusIcon = '⚠️';
            }

            const content = brouillon.generatedReport || window.t('drafts.status.generating');
            const truncatedContent = Utils.truncateText(content, 100);
            const sourceIndicator = brouillon.sourceType === 'upload' ? '📁' : '🎤';

            return `
                <div class="report-item ${statusClass}">
                    <div class="report-header">
                        <div class="report-title">${statusIcon} ${sourceIndicator} ${Utils.escapeHtml(brouillon.title || window.t('drafts.new.title'))}</div>
                        <div class="report-date">${date}</div>
                    </div>
                    <div class="report-content">${Utils.escapeHtml(truncatedContent)}</div>
                    <div class="report-actions">
                        ${brouillon.status === 'ready' ? `
                            <button class="action-btn edit-btn" onclick="window.dataManager.editBrouillon('${brouillon.id}')">✏️ ${window.t('btn.edit')}</button>
                            <button class="action-btn validate-btn" onclick="window.dataManager.validateBrouillon('${brouillon.id}')">✅ ${window.t('drafts.validate')}</button>
                        ` : ''}
                        ${brouillon.status === 'generating' ? `
                            <div class="loading-spinner"></div>
                        ` : ''}
                        ${brouillon.status === 'error' ? `
                            <button class="action-btn edit-btn" disabled>🔄 ${window.t('drafts.audio.unavailable')}</button>
                        ` : ''}
                        <button class="action-btn delete-btn" onclick="window.dataManager.deleteBrouillon('${brouillon.id}')">🗑️ ${window.t('btn.delete')}</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // === AFFICHAGE DES RAPPORTS ===

    updateRapportsUI(rapports) {
        const container = document.getElementById('rapportsList');
        const counter = document.getElementById('rapportsCount');
        const pdfCounter = document.getElementById('pdfCount');

        // Filtrer pour ne garder que les rapports originaux (pas les traductions)
        const originalRapports = rapports ? rapports.filter(r => !r.isTranslation) : [];

        if (counter) {
            counter.textContent = originalRapports.length;
        }

        if (pdfCounter) {
            const pdfCount = originalRapports.filter(r => r.hasPdf).length;
            pdfCounter.textContent = pdfCount;
        }

        if (!container) return;

        if (originalRapports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <p>${t('reports.empty')}</p>
                    <p class="empty-subtitle">${t('reports.empty.subtitle')}</p>
                </div>
            `;
            return;
        }

        const data = this.loadAppData();
        const folders = data.folders || [];

        // Grouper les traductions par rapport original
        const translationsByReport = {};
        if (rapports) {
            rapports.filter(r => r.isTranslation).forEach(translation => {
                const originalId = translation.originalReportId;
                if (!translationsByReport[originalId]) {
                    translationsByReport[originalId] = [];
                }
                translationsByReport[originalId].push(translation);
            });
        }

        // Stocker pour utilisation dans le rendu
        this.translationsByReport = translationsByReport;

        if (this.currentFolderId) {
            const currentFolder = folders.find(f => f.id === this.currentFolderId);
            const folderRapports = originalRapports.filter(r => r.folderId === this.currentFolderId);
            
            container.innerHTML = `
                <div class="breadcrumb-container">
                    <button 
                        class="breadcrumb-back-btn"
                        onclick="window.dataManager.closeFolder()"
                    >
                        ← Retour
                    </button>
                    
                    <span class="breadcrumb-separator">›</span>
                    
                    <div class="breadcrumb-current">
                        <span class="breadcrumb-folder-icon">📁</span>
                        <h2 class="breadcrumb-folder-name">
                            ${Utils.escapeHtml(currentFolder?.name || 'Dossier')}
                        </h2>
                        <span class="breadcrumb-folder-count">
                            ${folderRapports.length}
                        </span>
                    </div>
                    
                    <div class="breadcrumb-actions" onclick="event.stopPropagation();">
                        <button class="action-btn" style="background: var(--warning); color: white;" onclick="window.dataManager.renameFolder('${this.currentFolderId}')">
                            ✏️ Renommer
                        </button>
                        <button class="action-btn" style="background: var(--error); color: white;" onclick="window.dataManager.deleteFolder('${this.currentFolderId}')">
                            🗑️ Supprimer
                        </button>
                    </div>
                </div>
                
                <div class="reports-grid">
                    ${folderRapports.length > 0 ? folderRapports.map(rapport => this.renderRapportCard(rapport)).join('') : `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--gray-500);">
                            <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">📭</div>
                            <p style="font-size: 18px; font-weight: 600;">Ce dossier est vide</p>
                        </div>
                    `}
                </div>
            `;
            return;
        }

        const rapportsSansDossier = originalRapports.filter(r => !r.folderId);

        let html = '';

        if (folders.length > 0) {
            html += `
                <div style="margin-bottom: 40px;">
                    <h3 class="reports-section-title">
                        📁 Dossiers
                        <span class="count-badge">${folders.length}</span>
                    </h3>

                    <div class="folder-card-grid">
                        ${folders.map(folder => {
                            const folderRapports = originalRapports.filter(r => r.folderId === folder.id);
                            
                            return `
                                <div 
                                    class="folder-card"
                                    onclick="window.dataManager.openFolder('${folder.id}')"
                                >
                                    <div class="folder-card-content">
                                        <div class="folder-icon">📁</div>
                                        <div class="folder-info">
                                            <div class="folder-name">${Utils.escapeHtml(folder.name)}</div>
                                            <div class="folder-count">${this.getReportsCountText(folderRapports.length)}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="folder-actions" onclick="event.stopPropagation();">
                                        <button class="folder-action-btn" onclick="window.dataManager.renameFolder('${folder.id}')">
                                            ✏️
                                        </button>
                                        <button class="folder-action-btn" onclick="window.dataManager.deleteFolder('${folder.id}')">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        if (rapportsSansDossier.length > 0) {
            // Déterminer le layout selon la présence de dossiers
            const layoutClass = folders.length === 0 ? 'reports-layout-grid' : 'reports-layout-single';

            html += `
                <div>
                    <h3 class="reports-section-title">
                        📄 Aucun dossier
                        <span class="count-badge">${rapportsSansDossier.length}</span>
                    </h3>

                    <div class="reports-compact-list ${layoutClass}">
                        ${rapportsSansDossier.map(rapport => this.renderRapportCardCompact(rapport)).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    renderRapportCard(rapport) {
        const dateValidated = new Date(rapport.validatedAt).toLocaleDateString();
        const truncatedContent = Utils.truncateText(rapport.content, 150);
        
        let sourceIcon = '🎤';
        if (rapport.sourceType === 'upload') {
            sourceIcon = '📁';
        }
        
        const pdfIndicator = rapport.hasPdf ? '📄' : '';
        
        return `
            <div class="report-item report-card" id="report-${rapport.id}">
                <div class="report-header">
                    <div class="report-title">
                        ${sourceIcon} ${pdfIndicator} ${Utils.escapeHtml(rapport.title)}
                    </div>
                    <div class="report-date">Validé le ${dateValidated}</div>
                    
                    <!-- Bouton toggle mobile (3 points) -->
                    <button 
                        class="mobile-toggle-btn" 
                        onclick="event.stopPropagation(); this.closest('.report-card').classList.toggle('expanded');"
                        style="display: none; background: none; border: none; font-size: 20px; cursor: pointer; padding: 4px 8px; color: var(--gray-600);"
                    >⋮</button>
                </div>
                
                <div class="report-content">${Utils.escapeHtml(truncatedContent)}</div>
                
                <div class="report-actions">
                    <button class="action-btn view-btn" onclick="event.stopPropagation(); window.dataManager.viewRapport('${rapport.id}')">
                        👁️ ${t('btn.view')}
                    </button>

                    ${rapport.hasPdf ? `
                        <button class="action-btn download-pdf-btn" onclick="event.stopPropagation(); window.dataManager.downloadPDF('${rapport.id}')">
                            📄 PDF
                        </button>
                    ` : ''}

                    <button class="action-btn share-btn" onclick="event.stopPropagation(); window.dataManager.shareRapport('${rapport.id}')">
                        📤 ${t('btn.share')}
                    </button>

                    ${!rapport.isTranslation ? `
                        <button class="action-btn move-btn"
                                onclick="event.stopPropagation(); window.dataManager.showMoveFolderModal('${rapport.id}')">
                            📂 ${t('btn.move')}
                        </button>
                    ` : ''}

                    ${!rapport.isTranslation ? `
                        <div style="position: relative; display: inline-block;">
                            <button class="action-btn translate-btn"
                                    data-report-id="${rapport.id}"
                                    onclick="event.stopPropagation(); window.dataManager.toggleTranslateDropdown('${rapport.id}')">
                                <span class="icon-translate">🌐</span>
                                <span data-i18n="btn.translate">${t('btn.translate')}</span>
                                <span class="icon-dropdown">▼</span>
                            </button>

                            <div class="translate-dropdown"
                                 id="translate-dropdown-${rapport.id}"
                                 style="display: none;">
                                <button class="translate-option"
                                        data-lang="en"
                                        data-report-id="${rapport.id}"
                                        onclick="event.stopPropagation(); window.dataManager.handleTranslation('${rapport.id}', 'en')">
                                    🇬🇧 <span data-i18n="language.english">${t('language.english')}</span>
                                </button>
                                <button class="translate-option"
                                        data-lang="zh"
                                        data-report-id="${rapport.id}"
                                        onclick="event.stopPropagation(); window.dataManager.handleTranslation('${rapport.id}', 'zh')">
                                    🇨🇳 <span data-i18n="language.chinese">${t('language.chinese')}</span>
                                </button>
                                <button class="translate-option"
                                        data-lang="ja"
                                        data-report-id="${rapport.id}"
                                        onclick="event.stopPropagation(); window.dataManager.handleTranslation('${rapport.id}', 'ja')">
                                    🇯🇵 <span data-i18n="language.japanese">${t('language.japanese')}</span>
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    <button class="action-btn delete-btn"
                            onclick="event.stopPropagation(); (async () => { await window.dataManager.deleteRapport('${rapport.id}'); })();"
                            style="background: #ef4444; color: white;">
                        🗑️ ${t('btn.delete')}
                    </button>
                </div>
            </div>

            ${this.renderTranslationsSection(rapport.id)}
        `;
    }

    renderRapportCardCompact(rapport) {
        // Vérifier si le rapport a des traductions
        const translations = this.translationsByReport?.[rapport.id];
        const hasTranslation = translations && translations.length > 0;

        // Générer la carte du rapport original
        const originalCard = this.renderSingleReportCard(rapport, !hasTranslation, false);

        // Si traduction existe, générer aussi la carte de traduction
        if (hasTranslation) {
            const translation = translations[0]; // Prendre la première traduction
            const translationCard = this.renderSingleReportCard(translation, false, true);
            return originalCard + translationCard;
        }

        return originalCard;
    }

    renderSingleReportCard(rapport, spanTwoColumns = false, isTranslation = false) {
        const dateValidated = new Date(rapport.validatedAt).toLocaleDateString();
        const truncatedContent = Utils.truncateText(rapport.content, 150);

        let sourceIcon = '🎤';
        if (rapport.sourceType === 'upload') {
            sourceIcon = '📁';
        }

        const pdfIndicator = rapport.hasPdf ? '📄' : '';
        const gridClass = spanTwoColumns ? 'report-card-full' : 'report-card-half';
        const translationClass = isTranslation ? 'is-translation' : 'is-original';

        // Badge de langue pour les traductions
        const langBadge = isTranslation ? `
            <span style="
                background: #8b5cf6;
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 700;
                margin-left: 8px;
            ">
                🌐 ${this.getLanguageName(rapport.translatedTo)}
            </span>
        ` : '';

        return `
            <div class="report-item-compact ${gridClass} ${translationClass}"
                onclick="window.dataManager.viewRapport('${rapport.id}')"
                style="
                    background: ${isTranslation ? '#F8FCFF' : 'white'};
                    border: 1px solid ${isTranslation ? '#4A90E2' : 'var(--gray-200)'};
                    border-radius: 10px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: visible;
                "
                onmouseover="
                    this.style.borderColor='${isTranslation ? '#2563eb' : '#8B153840'}';
                    this.style.boxShadow='0 2px 8px ${isTranslation ? 'rgba(37, 99, 235, 0.15)' : 'rgba(139, 21, 56, 0.08)'}';
                    this.querySelector('.report-compact-indicator').style.opacity='1';
                "
                onmouseout="
                    this.style.borderColor='${isTranslation ? '#4A90E2' : 'var(--gray-200)'}';
                    this.style.boxShadow='none';
                    this.querySelector('.report-compact-indicator').style.opacity='0';
                "
            >
                <div class="report-compact-indicator" style="
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    background: ${isTranslation ? '#4A90E2' : 'var(--primary)'};
                    opacity: 0;
                    transition: all 0.2s ease;
                "></div>

                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 15px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                            <h4 style="
                                margin: 0;
                                font-size: 16px;
                                font-weight: 600;
                                color: var(--gray-900);
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                ${sourceIcon} ${pdfIndicator} ${Utils.escapeHtml(rapport.title)}
                                ${langBadge}
                            </h4>
                        </div>

                        <p style="
                            margin: 0;
                            font-size: 13px;
                            color: var(--gray-500);
                            overflow: hidden;
                            text-overflow: ellipsis;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                        ">
                            ${Utils.escapeHtml(truncatedContent)}
                        </p>
                    </div>

                    <div style="
                        font-size: 12px;
                        color: var(--gray-400);
                        background: var(--gray-50);
                        padding: 4px 10px;
                        border-radius: 8px;
                        white-space: nowrap;
                        border: 1px solid var(--gray-200);
                        font-weight: 500;
                    ">
                        ${dateValidated}
                    </div>
                </div>

                <div style="
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    padding-top: 12px;
                    border-top: 1px solid var(--gray-100);
                " onclick="event.stopPropagation();">
                    <button class="action-btn view-btn"
                            style="font-size: 11px; padding: 6px 12px;"
                            onclick="window.dataManager.viewRapport('${rapport.id}')">
                        👁️ ${t('btn.view')}
                    </button>

                    ${rapport.hasPdf ? `
                        <button class="action-btn download-pdf-btn"
                                style="font-size: 11px; padding: 6px 12px;"
                                onclick="window.dataManager.downloadPDF('${rapport.id}')">
                            📄 PDF
                        </button>
                    ` : ''}

                    <button class="action-btn share-btn"
                            style="font-size: 11px; padding: 6px 12px;"
                            onclick="window.dataManager.shareRapport('${rapport.id}')">
                        📤 ${t('btn.share')}
                    </button>

                    ${!rapport.isTranslation ? `
                        <button class="action-btn move-btn"
                                style="font-size: 11px; padding: 6px 12px;"
                                onclick="window.dataManager.showMoveFolderModal('${rapport.id}')">
                            📂 ${t('btn.move')}
                        </button>
                    ` : ''}

                    ${!rapport.isTranslation ? `
                        <div style="position: relative; display: inline-block;">
                            <button class="action-btn translate-btn"
                                    data-report-id="${rapport.id}"
                                    style="font-size: 11px; padding: 6px 12px;"
                                    onclick="event.stopPropagation(); window.dataManager.toggleTranslateDropdown('${rapport.id}')">
                                <span class="icon-translate">🌐</span>
                                <span data-i18n="btn.translate">${t('btn.translate')}</span>
                                <span class="icon-dropdown">▼</span>
                            </button>

                            <div class="translate-dropdown"
                                 id="translate-dropdown-${rapport.id}"
                                 style="display: none;">
                                <button class="translate-option"
                                        data-lang="en"
                                        data-report-id="${rapport.id}"
                                        onclick="event.stopPropagation(); window.dataManager.handleTranslation('${rapport.id}', 'en')">
                                    🇬🇧 <span data-i18n="language.english">${t('language.english')}</span>
                                </button>
                                <button class="translate-option"
                                        data-lang="zh"
                                        data-report-id="${rapport.id}"
                                        onclick="event.stopPropagation(); window.dataManager.handleTranslation('${rapport.id}', 'zh')">
                                    🇨🇳 <span data-i18n="language.chinese">${t('language.chinese')}</span>
                                </button>
                                <button class="translate-option"
                                        data-lang="ja"
                                        data-report-id="${rapport.id}"
                                        onclick="event.stopPropagation(); window.dataManager.handleTranslation('${rapport.id}', 'ja')">
                                    🇯🇵 <span data-i18n="language.japanese">${t('language.japanese')}</span>
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    <button class="action-btn delete-btn"
                            style="font-size: 11px; padding: 6px 12px; background: #ef4444; color: white;"
                            onclick="window.dataManager.deleteRapport('${rapport.id}')">
                        🗑️ ${t('btn.delete')}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Génère le HTML pour afficher les traductions d'un rapport
     * @param {string} reportId - ID du rapport original
     * @returns {string} HTML de la section des traductions
     */
    renderTranslationsSection(reportId) {
        const translations = this.translationsByReport?.[reportId];

        if (!translations || translations.length === 0) {
            return '';
        }

        const langNames = {
            en: window.t('language.english'),
            zh: window.t('language.chinese'),
            ja: window.t('language.japanese')
        };

        const langFlags = {
            en: '🇬🇧',
            zh: '🇨🇳',
            ja: '🇯🇵'
        };

        return `
            <div class="translations-section expanded">
                <div class="translations-header" onclick="event.stopPropagation(); this.parentElement.classList.toggle('expanded');">
                    <span>🌐 ${window.t('translations.title')} (${translations.length})</span>
                    <span class="toggle-icon">▼</span>
                </div>

                <div class="translations-list">
                    ${translations.map(translation => {
                        const dateValidated = new Date(translation.validatedAt || translation.createdAt).toLocaleDateString();
                        const truncatedContent = Utils.truncateText(translation.content, 100);
                        const langCode = translation.translatedTo || 'en';
                        const langFlag = langFlags[langCode] || '🌐';
                        const langName = langNames[langCode] || langCode.toUpperCase();

                        return `
                            <div
                                class="report-item-compact translation"
                                onclick="window.dataManager.viewRapport('${translation.id}')"
                                style="
                                    background: #F8FCFF;
                                    border: 1px solid #4A90E2;
                                    border-radius: 10px;
                                    padding: 15px;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                    margin-top: 8px;
                                "
                            >
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 15px;">
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                                            <span style="
                                                background: #4A90E2;
                                                color: white;
                                                padding: 2px 8px;
                                                border-radius: 4px;
                                                font-size: 11px;
                                                font-weight: 700;
                                            ">
                                                ${langFlag} ${langName}
                                            </span>
                                            <h4 style="
                                                margin: 0;
                                                font-size: 15px;
                                                font-weight: 600;
                                                color: var(--gray-900);
                                                display: flex;
                                                align-items: center;
                                                gap: 6px;
                                            ">
                                                ${Utils.escapeHtml(translation.title)}
                                            </h4>
                                        </div>

                                        <p style="
                                            margin: 0;
                                            font-size: 12px;
                                            color: var(--gray-600);
                                            overflow: hidden;
                                            text-overflow: ellipsis;
                                            display: -webkit-box;
                                            -webkit-line-clamp: 2;
                                            -webkit-box-orient: vertical;
                                        ">
                                            ${Utils.escapeHtml(truncatedContent)}
                                        </p>
                                    </div>

                                    <div style="
                                        font-size: 11px;
                                        color: var(--gray-400);
                                        background: var(--gray-50);
                                        padding: 3px 8px;
                                        border-radius: 6px;
                                        white-space: nowrap;
                                        border: 1px solid var(--gray-200);
                                        font-weight: 500;
                                    ">
                                        ${dateValidated}
                                    </div>
                                </div>

                                <div style="
                                    display: flex;
                                    gap: 6px;
                                    flex-wrap: wrap;
                                    padding-top: 10px;
                                    border-top: 1px solid rgba(74, 144, 226, 0.2);
                                " onclick="event.stopPropagation();">
                                    <button class="action-btn view-btn"
                                            style="font-size: 10px; padding: 5px 10px;"
                                            onclick="window.dataManager.viewRapport('${translation.id}')">
                                        👁️ ${t('btn.view')}
                                    </button>

                                    ${translation.hasPdf ? `
                                        <button class="action-btn download-pdf-btn"
                                                style="font-size: 10px; padding: 5px 10px;"
                                                onclick="window.dataManager.downloadPDF('${translation.id}')">
                                            📄 PDF
                                        </button>
                                    ` : ''}

                                    <button class="action-btn share-btn"
                                            style="font-size: 10px; padding: 5px 10px;"
                                            onclick="window.dataManager.shareRapport('${translation.id}')">
                                        📤 ${t('btn.share')}
                                    </button>

                                    <button class="action-btn delete-btn"
                                            style="font-size: 10px; padding: 5px 10px; background: #ef4444; color: white;"
                                            onclick="window.dataManager.deleteRapport('${translation.id}')">
                                        🗑️ ${t('btn.delete')}
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // ============================================
    // SYSTÈME DE TRADUCTION AUTOMATIQUE
    // ============================================

    /**
     * Traduit un rapport via le webhook N8N
     * @param {string} reportId - ID du rapport à traduire
     * @param {string} targetLanguage - Code langue cible : "en", "zh", "ja"
     * @returns {Promise<Object>} Le rapport traduit créé
     */
    async translateReport(reportId, targetLanguage) {
        try {
            console.log(`🚀 Début traduction du rapport ${reportId} vers ${targetLanguage}`);

            // 1. Récupérer le rapport original
            const { data: originalReport, error: fetchError } = await window.supabaseClient
                .from('reports')
                .select('*')
                .eq('id', reportId)
                .single();

            if (fetchError) {
                console.error('❌ Erreur récupération rapport:', fetchError);
                throw new Error('Impossible de récupérer le rapport');
            }

            if (!originalReport) {
                throw new Error('Rapport non trouvé');
            }

            console.log('✅ Rapport original récupéré:', originalReport.title);

            // 2. Vérifier si une traduction existe déjà
            const { data: existingTranslation } = await window.supabaseClient
                .from('reports')
                .select('id')
                .eq('original_report_id', reportId)
                .eq('translated_to', targetLanguage)
                .single();

            if (existingTranslation) {
                throw new Error(`Une traduction en ${targetLanguage} existe déjà`);
            }

            // 3. Appeler le webhook N8N
            console.log('📡 Appel webhook N8N...');
            const webhookResponse = await fetch('https://andreaprogra.app.n8n.cloud/webhook/translate-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    report_id: reportId,
                    user_id: originalReport.user_id,
                    target_language: targetLanguage,
                    content: originalReport.content
                })
            });

            if (!webhookResponse.ok) {
                console.error('❌ Erreur N8N:', webhookResponse.status, webhookResponse.statusText);
                throw new Error(`Erreur N8N: ${webhookResponse.status}`);
            }

            const translationResult = await webhookResponse.json();
            console.log('📦 Réponse N8N:', translationResult);

            if (!translationResult.success) {
                throw new Error(translationResult.error || 'Erreur de traduction');
            }

            console.log('✅ Traduction reçue de N8N');

            // 4. Créer le nouveau rapport traduit
            const newReportId = `rapport_${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

            const translatedReport = {
                id: newReportId,
                user_id: originalReport.user_id,
                title: translationResult.translatedTitle || originalReport.title,
                content: translationResult.translatedContent || translationResult.translated_content,
                status: 'validated',
                folder_id: originalReport.folder_id,
                pdf_url: null,
                audio_url: null,
                source_type: 'translation',
                source_info: `Traduit depuis ${reportId}`,
                is_modified: false,
                has_pdf: false,
                pdf_generated: false,
                detected_language: targetLanguage,
                validated_at: new Date().toISOString(),
                translated_at: new Date().toISOString(),
                shared_with: [],
                is_translation: true,
                original_report_id: reportId,
                translated_to: targetLanguage,
                created_at: new Date().toISOString()
            };

            console.log('📝 Création du rapport traduit:', translatedReport);

            // 5. Insérer dans Supabase
            const { data: createdReport, error: insertError } = await window.supabaseClient
                .from('reports')
                .insert([translatedReport])
                .select()
                .single();

            if (insertError) {
                console.error('❌ Erreur insertion rapport traduit:', insertError);
                console.error('Détails:', JSON.stringify(insertError, null, 2));
                throw new Error('Impossible de sauvegarder la traduction');
            }

            console.log('✅ Rapport traduit créé avec succès:', createdReport.id);

            // 6. Générer le PDF de la traduction
            console.log('📄 Génération du PDF de la traduction...');
            try {
                const pdf = await Utils.generatePDF(createdReport.title, createdReport.content);

                if (this.canUseSupabase()) {
                    const pdfUrl = await this.uploadPdfToStorage(
                        pdf.output('datauristring'),
                        createdReport.title
                    );

                    if (pdfUrl) {
                        // Mettre à jour le rapport avec le PDF
                        const { error: updateError } = await window.supabaseClient
                            .from('reports')
                            .update({
                                pdf_url: pdfUrl,
                                has_pdf: true,
                                pdf_generated: true
                            })
                            .eq('id', createdReport.id);

                        if (!updateError) {
                            createdReport.pdf_url = pdfUrl;
                            createdReport.has_pdf = true;
                            createdReport.pdf_generated = true;
                            console.log('✅ PDF de la traduction généré et uploadé');
                        }
                    }
                }
            } catch (pdfError) {
                console.error('⚠️ Erreur génération PDF traduction:', pdfError);
                // Ne pas bloquer la traduction si le PDF échoue
            }

            // 7. Enregistrer dans l'historique de traduction
            console.log('🔍 Tentative d\'insertion dans translation_history...');

            const historyData = {
                report_id: createdReport.id,
                user_id: originalReport.user_id,
                source_language: translationResult.detectedSourceLanguage || 'fr',
                target_language: targetLanguage,
                character_count: originalReport.content.length,
                service_used: 'n8n-webhook',
                cost_estimate: null,
                translation_time_ms: null,
                success: true,
                error_message: null,
                created_at: new Date().toISOString()
            };

            console.log('📊 Données historique:', historyData);

            const { data: historyResult, error: historyError } = await window.supabaseClient
                .from('translation_history')
                .insert([historyData])
                .select();

            if (historyError) {
                console.error('❌ ERREUR insertion translation_history:', historyError);
                console.error('Code:', historyError.code);
                console.error('Message:', historyError.message);
                console.error('Détails:', JSON.stringify(historyError, null, 2));
                // NE PAS bloquer si l'historique échoue
            } else {
                console.log('✅ Historique de traduction enregistré:', historyResult);
            }

            return createdReport;

        } catch (error) {
            console.error('💥 Erreur globale lors de la traduction:', error);
            throw error;
        }
    }

    /**
     * Récupère toutes les traductions d'un rapport
     * @param {string} reportId - ID du rapport original
     * @returns {Promise<Array>} Liste des traductions
     */
    async getReportTranslations(reportId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('reports')
                .select('*')
                .eq('original_report_id', reportId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('❌ Erreur récupération traductions:', error);
            return [];
        }
    }

    /**
     * Toggle le dropdown de traduction
     * Ferme tous les autres dropdowns ouverts
     * @param {string} reportId - ID du rapport
     */
    toggleTranslateDropdown(reportId) {
        // Vérifier le plan de l'utilisateur
        const currentUser = window.appManager?.getCurrentUser();
        if (currentUser && currentUser.subscription_plan !== 'pro') {
            // Afficher modal upgrade pour les utilisateurs FREE
            Utils.showUpgradeModal(
                t('modal.pro.translation.title'),
                t('modal.pro.translation.description'),
                'translation'
            );
            return;
        }

        // Fermer tous les autres dropdowns
        document.querySelectorAll('.translate-dropdown').forEach(dropdown => {
            if (dropdown.id !== `translate-dropdown-${reportId}`) {
                dropdown.style.display = 'none';
            }
        });

        // Toggle le dropdown ciblé
        const dropdown = document.getElementById(`translate-dropdown-${reportId}`);
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Gère la traduction d'un rapport
     * @param {string} reportId - ID du rapport à traduire
     * @param {string} targetLanguage - Langue cible (en, zh, ja)
     */
    async handleTranslation(reportId, targetLanguage) {
        const button = document.querySelector(`.translate-btn[data-report-id="${reportId}"]`);
        const dropdown = document.getElementById(`translate-dropdown-${reportId}`);

        try {
            // 1. Fermer le dropdown
            if (dropdown) {
                dropdown.style.display = 'none';
            }

            // 2. Afficher l'état de chargement
            if (button) {
                button.classList.add('translating');
                button.disabled = true;
                button.innerHTML = `
                    <span class="icon-spinner">⏳</span>
                    <span data-i18n="translating.inprogress">${window.t('translating.inprogress')}</span>
                `;
            }

            // 3. Appeler la traduction
            const translatedReport = await this.translateReport(reportId, targetLanguage);

            // 4. Afficher le toast de succès
            const langNames = {
                en: window.t('language.english'),
                zh: window.t('language.chinese'),
                ja: window.t('language.japanese')
            };
            this.showToast(
                window.t('translation.success', { language: langNames[targetLanguage] }),
                'success'
            );

            // 5. Rafraîchir l'affichage des rapports
            await this.syncFromSupabase();
            this.loadRapportsData();

        } catch (error) {
            console.error('❌ Erreur handleTranslation:', error);

            // Afficher le toast d'erreur
            let errorMessage = window.t('translation.error');

            // Si c'est une erreur de traduction déjà existante
            if (error.message && error.message.includes('existe déjà')) {
                errorMessage = error.message;
            }

            this.showToast(errorMessage, 'error');

            // Réactiver le bouton
            if (button) {
                button.classList.remove('translating');
                button.disabled = false;
                button.innerHTML = `
                    <span class="icon-translate">🌐</span>
                    <span data-i18n="btn.translate">${window.t('btn.translate')}</span>
                    <span class="icon-dropdown">▼</span>
                `;
            }
        }
    }

    /**
     * Affiche une notification toast
     * @param {string} message - Message à afficher
     * @param {string} type - Type de toast ('success' ou 'error')
     */
    showToast(message, type = 'success') {
        // Créer l'élément toast
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;

        const icon = type === 'success' ? '✅' : '❌';

        toast.innerHTML = `
            <span style="font-size: 20px;">${icon}</span>
            <span style="flex: 1;">${message}</span>
        `;

        // Ajouter au DOM
        document.body.appendChild(toast);

        // Supprimer après 4 secondes
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    /**
     * 🔍 DIAGNOSTIC PDF - Affiche l'état des PDF de tous les rapports
     * À appeler dans la console : window.dataManager.diagnosticPDF()
     */
    diagnosticPDF() {
        console.log('='.repeat(60));
        console.log('🔍 DIAGNOSTIC PDF - Tous les rapports');
        console.log('='.repeat(60));

        const data = this.loadAppData();
        const rapports = data.rapports || [];

        if (rapports.length === 0) {
            console.log('⚠️ Aucun rapport trouvé');
            return;
        }

        console.log(`📊 Total de rapports: ${rapports.length}\n`);

        let withPDF = 0;
        let withoutPDF = 0;
        let withPdfUrl = 0;
        let withPdfData = 0;

        rapports.forEach((rapport, index) => {
            const hasPdf = rapport.hasPdf || false;
            const pdfUrl = rapport.pdfUrl;
            const pdfData = rapport.pdfData;
            const isTranslation = rapport.isTranslation || false;

            console.log(`${index + 1}. "${rapport.title}"`);
            console.log(`   ${isTranslation ? '🌐 [TRADUCTION]' : '📄 [ORIGINAL]'}`);
            console.log(`   - hasPdf: ${hasPdf ? '✅ true' : '❌ false'}`);
            console.log(`   - pdfUrl: ${pdfUrl ? '✅ ' + pdfUrl.substring(0, 50) + '...' : '❌ null'}`);
            console.log(`   - pdfData: ${pdfData ? '✅ présent' : '❌ null'}`);
            console.log(`   - ID: ${rapport.id}`);
            console.log('');

            if (hasPdf) withPDF++;
            else withoutPDF++;

            if (pdfUrl) withPdfUrl++;
            if (pdfData) withPdfData++;
        });

        console.log('='.repeat(60));
        console.log('📊 RÉSUMÉ:');
        console.log(`   ✅ Rapports AVEC PDF (hasPdf=true): ${withPDF}`);
        console.log(`   ❌ Rapports SANS PDF (hasPdf=false): ${withoutPDF}`);
        console.log(`   🔗 Rapports avec pdfUrl: ${withPdfUrl}`);
        console.log(`   💾 Rapports avec pdfData: ${withPdfData}`);
        console.log('='.repeat(60));

        if (withoutPDF > 0) {
            console.log('\n⚠️ ATTENTION: Certains rapports n\'ont pas de PDF !');
            console.log('💡 Suggestion: Utiliser window.dataManager.regenerateAllPDFs()');
        }
    }

    /**
     * 🔧 RÉGÉNÉRATION PDF - Génère les PDF manquants pour tous les rapports
     * À appeler dans la console : window.dataManager.regenerateAllPDFs()
     */
    async regenerateAllPDFs() {
        console.log('='.repeat(60));
        console.log('🔧 RÉGÉNÉRATION PDF - Tous les rapports sans PDF');
        console.log('='.repeat(60));

        const data = this.loadAppData();
        const rapports = data.rapports || [];

        if (rapports.length === 0) {
            console.log('⚠️ Aucun rapport trouvé');
            Utils.showToast('Aucun rapport à traiter', 'info');
            return;
        }

        const rapportsSansPDF = rapports.filter(r => !r.hasPdf);

        if (rapportsSansPDF.length === 0) {
            console.log('✅ Tous les rapports ont déjà un PDF !');
            Utils.showToast('Tous les rapports ont déjà un PDF', 'success');
            return;
        }

        console.log(`📊 Rapports à traiter: ${rapportsSansPDF.length}`);
        Utils.showToast(`Génération de ${rapportsSansPDF.length} PDF...`, 'info', 0);

        let success = 0;
        let errors = 0;

        for (const rapport of rapportsSansPDF) {
            try {
                console.log(`\n📄 Génération PDF pour: "${rapport.title}"`);

                // 1. Générer le PDF
                const pdf = await Utils.generatePDF(rapport.title, rapport.content);

                // 2. Uploader vers Supabase Storage (si connecté)
                if (this.canUseSupabase()) {
                    const pdfUrl = await this.uploadPdfToStorage(
                        pdf.output('datauristring'),
                        rapport.title
                    );

                    if (pdfUrl) {
                        // 3. Mettre à jour dans Supabase
                        const { error: updateError } = await window.supabaseClient
                            .from('reports')
                            .update({
                                pdf_url: pdfUrl,
                                has_pdf: true,
                                pdf_generated: true
                            })
                            .eq('id', rapport.id);

                        if (!updateError) {
                            // 4. Mettre à jour en local
                            rapport.pdfUrl = pdfUrl;
                            rapport.hasPdf = true;
                            rapport.pdfGenerated = true;

                            console.log(`✅ PDF généré et uploadé: ${rapport.id}`);
                            success++;
                        } else {
                            console.error(`❌ Erreur update Supabase:`, updateError);
                            errors++;
                        }
                    } else {
                        // Fallback: stocker en local (pdfData)
                        rapport.pdfData = pdf.output('datauristring');
                        rapport.hasPdf = true;
                        rapport.pdfGenerated = true;

                        console.log(`✅ PDF généré (local): ${rapport.id}`);
                        success++;
                    }
                } else {
                    // Mode hors ligne: stocker en local
                    rapport.pdfData = pdf.output('datauristring');
                    rapport.hasPdf = true;
                    rapport.pdfGenerated = true;

                    console.log(`✅ PDF généré (local): ${rapport.id}`);
                    success++;
                }

            } catch (error) {
                console.error(`❌ Erreur génération PDF pour "${rapport.title}":`, error);
                errors++;
            }
        }

        // 5. Sauvegarder les changements locaux
        this.saveAppData(data);

        // 6. Rafraîchir l'UI
        await this.syncFromSupabase();
        this.loadRapportsData();

        console.log('\n' + '='.repeat(60));
        console.log('📊 RÉSULTAT:');
        console.log(`   ✅ Succès: ${success}`);
        console.log(`   ❌ Échecs: ${errors}`);
        console.log('='.repeat(60));

        Utils.showToast(
            `PDF régénérés: ${success} succès, ${errors} échecs`,
            errors === 0 ? 'success' : 'warning'
        );

        return { success, errors };
    }
    }