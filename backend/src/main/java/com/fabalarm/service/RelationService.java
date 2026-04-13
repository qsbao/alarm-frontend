package com.fabalarm.service;

import com.fabalarm.model.*;
import com.fabalarm.repository.IssueActivityRepository;
import com.fabalarm.repository.IssueRelationRepository;
import com.fabalarm.repository.IssueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RelationService {

    // Product routes: product name -> ordered list of operation names
    private static final Map<String, List<String>> PRODUCT_ROUTES = new LinkedHashMap<>();
    static {
        PRODUCT_ROUTES.put("A7-Litho", List.of(
                "Lot start", "Wafer transfer", "Chamber pump-down",
                "Recipe step 3", "Endpoint detect", "Vent cycle"));
        PRODUCT_ROUTES.put("B3-Etch", List.of(
                "Lot start", "Chamber pump-down", "Process clean",
                "Recipe step 3", "Endpoint detect", "Vent cycle"));
        PRODUCT_ROUTES.put("C2-CVD", List.of(
                "Lot start", "Wafer transfer", "Chamber pump-down",
                "Process clean", "Recipe step 3", "Idle / standby"));
        PRODUCT_ROUTES.put("D1-PVD", List.of(
                "Lot start", "Wafer transfer", "Chamber pump-down",
                "Process clean", "Endpoint detect", "Vent cycle"));
        PRODUCT_ROUTES.put("E5-CMP", List.of(
                "Lot start", "Wafer transfer", "Process clean",
                "Recipe step 3", "Idle / standby", "Vent cycle"));
        PRODUCT_ROUTES.put("F4-Metro", List.of(
                "Lot start", "Wafer transfer", "Chamber pump-down",
                "Recipe step 3", "Endpoint detect", "Vent cycle"));
    }

    private static final Set<IssueStatus> OPEN_STATUSES = Set.of(IssueStatus.Triage, IssueStatus.Investigating);

    private final IssueRelationRepository relationRepository;
    private final IssueRepository issueRepository;
    private final IssueActivityRepository activityRepository;

    public RelationService(IssueRelationRepository relationRepository,
                           IssueRepository issueRepository,
                           IssueActivityRepository activityRepository) {
        this.relationRepository = relationRepository;
        this.issueRepository = issueRepository;
        this.activityRepository = activityRepository;
    }

    // --- Blockers ---

    @Transactional
    public IssueRelation addBlocker(String fromIssueId, String toIssueId, User user) {
        // Check idempotency
        Optional<IssueRelation> existing = relationRepository
                .findByFromIssueIdAndToIssueIdAndType(fromIssueId, toIssueId, IssueRelationType.BLOCKER);
        if (existing.isPresent()) return existing.get();

        IssueRelation rel = new IssueRelation();
        rel.setFromIssueId(fromIssueId);
        rel.setToIssueId(toIssueId);
        rel.setType(IssueRelationType.BLOCKER);
        rel.setCreatedBy(user.getName());
        rel.setCreatedAt(Instant.now());
        relationRepository.save(rel);

        logActivity(fromIssueId, IssueActivityType.blocker_added, user.getName(), toIssueId);
        logActivity(toIssueId, IssueActivityType.blocker_added, user.getName(), fromIssueId);

        return rel;
    }

    @Transactional
    public void removeBlocker(String fromIssueId, String toIssueId, User user) {
        relationRepository.deleteByFromIssueIdAndToIssueIdAndType(
                fromIssueId, toIssueId, IssueRelationType.BLOCKER);

        logActivity(fromIssueId, IssueActivityType.blocker_removed, user.getName(), toIssueId);
        logActivity(toIssueId, IssueActivityType.blocker_removed, user.getName(), fromIssueId);
    }

    public List<IssueRelation> getBlockers(String issueId) {
        return relationRepository.findByFromIssueIdAndType(issueId, IssueRelationType.BLOCKER);
    }

    // --- Highlights ---

    @Transactional
    public IssueRelation addHighlight(String fromIssueId, String toIssueId, User user) {
        // Check idempotency
        Optional<IssueRelation> existing = relationRepository
                .findByFromIssueIdAndToIssueIdAndType(fromIssueId, toIssueId, IssueRelationType.HIGHLIGHT);
        if (existing.isPresent()) return existing.get();

        IssueRelation rel = new IssueRelation();
        rel.setFromIssueId(fromIssueId);
        rel.setToIssueId(toIssueId);
        rel.setType(IssueRelationType.HIGHLIGHT);
        rel.setCreatedBy(user.getName());
        rel.setCreatedAt(Instant.now());
        relationRepository.save(rel);

        logActivity(fromIssueId, IssueActivityType.highlight_added, user.getName(), toIssueId);
        logActivity(toIssueId, IssueActivityType.highlight_added, user.getName(), fromIssueId);

        return rel;
    }

    @Transactional
    public void removeHighlight(String fromIssueId, String toIssueId, User user) {
        relationRepository.deleteByFromIssueIdAndToIssueIdAndType(
                fromIssueId, toIssueId, IssueRelationType.HIGHLIGHT);

        logActivity(fromIssueId, IssueActivityType.highlight_removed, user.getName(), toIssueId);
        logActivity(toIssueId, IssueActivityType.highlight_removed, user.getName(), fromIssueId);
    }

    // --- Highlight candidate discovery ---

    /**
     * Returns upstream operations on the same product route as the given issue,
     * each paired with existing open issues on that operation.
     */
    public List<Map<String, Object>> listHighlightCandidates(String issueId) {
        Issue issue = issueRepository.findById(issueId).orElse(null);
        if (issue == null) return List.of();

        List<String> route = PRODUCT_ROUTES.get(issue.getProduct());
        if (route == null) return List.of();

        int parentIdx = route.indexOf(issue.getOperName());
        if (parentIdx <= 0) return List.of();

        List<String> upstream = route.subList(0, parentIdx);
        List<Issue> allIssues = issueRepository.findAll();

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < upstream.size(); i++) {
            String opName = upstream.get(i);
            String opId = issue.getProduct() + ":" + opName;

            List<Map<String, Object>> openIssues = allIssues.stream()
                    .filter(iss -> !iss.getId().equals(issueId)
                            && iss.getProduct().equals(issue.getProduct())
                            && iss.getOperName() != null && iss.getOperName().equals(opName)
                            && OPEN_STATUSES.contains(iss.getStatus()))
                    .map(iss -> {
                        Map<String, Object> dto = new LinkedHashMap<>();
                        dto.put("id", iss.getId());
                        dto.put("title", iss.getTitle());
                        dto.put("status", iss.getStatus().name());
                        return dto;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> candidate = new LinkedHashMap<>();
            Map<String, Object> operation = new LinkedHashMap<>();
            operation.put("id", opId);
            operation.put("name", opName);
            operation.put("order", i);
            candidate.put("operation", operation);
            candidate.put("existingOpenIssues", openIssues);
            result.add(candidate);
        }

        return result;
    }

    /**
     * Creates a new child issue for the target operation and links it as a
     * highlight relation to the parent issue.
     */
    @Transactional
    public Map<String, Object> createHighlightedIssue(String parentIssueId,
                                                       String targetOperationId,
                                                       User user) {
        Issue parent = issueRepository.findById(parentIssueId)
                .orElseThrow(() -> new IllegalArgumentException("Parent issue not found: " + parentIssueId));

        // Parse "Product:Operation name"
        int sepIdx = targetOperationId.indexOf(':');
        if (sepIdx < 0) throw new IllegalArgumentException("Invalid operation id: " + targetOperationId);
        String productName = targetOperationId.substring(0, sepIdx);
        String opName = targetOperationId.substring(sepIdx + 1);

        List<String> route = PRODUCT_ROUTES.get(productName);
        if (route == null) throw new IllegalArgumentException("Unknown product: " + productName);
        if (!route.contains(opName)) throw new IllegalArgumentException("Operation not on route: " + opName);

        // Generate child issue ID
        String childId = generateIssueId();

        Issue child = new Issue();
        child.setId(childId);
        child.setTitle("Highlight: " + opName + " on " + productName);
        child.setDate(Instant.now());
        child.setRiskLevel(parent.getRiskLevel());
        child.setStatus(IssueStatus.Triage);
        child.setIssueTime(Instant.now());
        child.setOperName(opName);
        child.setProduct(productName);
        child.setOwnerId(user.getId());
        child.setDepartment(parent.getDepartment());
        child.setDescription("Highlighted upstream operation \"" + opName + "\" from " + parentIssueId + ".");
        issueRepository.save(child);

        // Log created activity on child
        logActivityText(childId, IssueActivityType.created, user.getName(), null);

        // Create highlight relation
        addHighlight(parentIssueId, childId, user);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("parentIssueId", parentIssueId);
        result.put("childIssueId", childId);
        return result;
    }

    // --- Helpers ---

    private void logActivity(String issueId, IssueActivityType type, String author, String blockerIssueId) {
        IssueActivity activity = new IssueActivity();
        activity.setIssueId(issueId);
        activity.setType(type);
        activity.setTimestamp(Instant.now());
        activity.setAuthor(author);
        activity.setBlockerIssueId(blockerIssueId);
        activityRepository.save(activity);
    }

    private void logActivityText(String issueId, IssueActivityType type, String author, String text) {
        IssueActivity activity = new IssueActivity();
        activity.setIssueId(issueId);
        activity.setType(type);
        activity.setTimestamp(Instant.now());
        activity.setAuthor(author);
        activity.setText(text);
        activityRepository.save(activity);
    }

    private String generateIssueId() {
        List<Issue> all = issueRepository.findAll();
        int maxNum = all.stream()
                .map(Issue::getId)
                .filter(id -> id.startsWith("iss-"))
                .map(id -> id.substring(4))
                .mapToInt(s -> {
                    try { return Integer.parseInt(s); }
                    catch (NumberFormatException e) { return 0; }
                })
                .max()
                .orElse(0);
        return String.format("iss-%03d", maxNum + 1);
    }
}
