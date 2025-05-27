package com.ware.spring.member.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ware.spring.member.domain.Distributor;

@Repository
public interface DistributorRepository extends JpaRepository<Distributor, Long> {
    @Query("SELECT d.distributorName FROM Distributor d WHERE d.distributorNo = :distributorNo")
    String findDistributorNameByDistributorNo(@Param("distributorNo") Long distributorNo);
    @Query("SELECT d FROM Distributor d LEFT JOIN FETCH d.members")
    List<Distributor> findAllWithMembers();
    

    Page<Distributor> findByDistributorNameContaining(String name, Pageable pageable);

    Page<Distributor> findByDistributorNameContainingAndDistributorStatus(String name, int status, Pageable pageable);

    Page<Distributor> findByDistributorAddrContaining(String address, Pageable pageable);

    Page<Distributor> findByDistributorAddrContainingAndDistributorStatus(String address, int status, Pageable pageable);

    Page<Distributor> findByDistributorStatus(int status, Pageable pageable);
}